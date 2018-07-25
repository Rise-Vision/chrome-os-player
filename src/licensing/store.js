const util = require('../util');
const systemInfo = require('../logging/system-info');
const logger = require('../logging/logger');
const viewerMessaging = require('../messaging/viewer-messaging');
const storageLocalMessaging = require('../storage/messaging/local-messaging-helper');
const storageMessaging = require('../storage/messaging/messaging');
const fileSystem = require('../storage/file-system');
const displayConfigBucket = 'risevision-display-notifications';

const MAX_RETRIES = 10;
const RETRY_INTERVAL = 10000;
const ACTIVE_STATUSES = ["Free", "On Trial", "Subscribed"];
const SUBSCRIPTION_API_SERVER = 'store-dot-rvaserver2.appspot.com';
const STORAGE_PRODUCT_CODE = 'b0cba08a4baa0c62b8cdc621b6f6a124f89a03db';
const STORAGE_SUBSCRIPTION_URL = `https://${SUBSCRIPTION_API_SERVER}/v1/company/CID/product/status?pc=${STORAGE_PRODUCT_CODE}`;
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // eslint-disable-line no-magic-numbers
const ONE_HOUR_MS = ONE_DAY_MS / 24; // eslint-disable-line no-magic-numbers

let companyIdPromise = null;
let storageIsAuthorized = null;

module.exports = {
  init() {
    updateStorageAuth();
    viewerMessaging.on('storage-licensing-request', sendLicensingUpdate);
  }
};

function updateStorageAuth() {
  getCompanyId()
  .then(querySubscriptionAPI)
  .then(json=>ACTIVE_STATUSES.includes(json[0].status))
  .then(isActive=>{
    storageIsAuthorized = isActive;
    sendLicensingUpdate();
    setTimeout(()=>module.exports.updateStorageAuth(), ONE_DAY_MS);
  })
  .catch(err=>{
    logger.error('licensing - error on updating storage authorization', err);
    setTimeout(()=>module.exports.updateStorageAuth(), ONE_HOUR_MS);
  })
}

function getCompanyId() {
  if (companyIdPromise) {return companyIdPromise}

  companyIdPromise = new Promise(res=>{
    storageLocalMessaging.registerLocalListener(resolveCompanyId.bind(null, res));
  });

  systemInfo.getDisplayId().then(displayId=>{
    storageMessaging.handleWatch({
      from: 'licensing',
      topic: 'WATCH',
      filePath: `${displayConfigBucket}/${displayId}/display.json`
    });
  });

  return companyIdPromise;
}

function resolveCompanyId(resolver, {topic, status, filePath, ospath} = {}) {
  if (!filePath.endsWith('display.json')) {return}
  if (!filePath || !filePath.startsWith(displayConfigBucket)) {return}
  if (topic !== 'FILE-UPDATE' || status !== 'CURRENT') {
    if (["DELETED", "NOEXIST"].includes(status)) {logger.error('licensing - display file not found');}
    return;
  }

  return fileSystem.readCachedFileAsObject(ospath.split("/").pop())
  .then(obj=>{
    resolver(obj.companyId);
    logger.log(`licensing - company id set to ${obj.companyId}`);
  })
  .catch(err=>{
    logger.error('licensing - error when setting company id', err);
    console.error(Error(err.message))
  });
}

function querySubscriptionAPI(cid) {
  const url = STORAGE_SUBSCRIPTION_URL.replace("CID", cid);

  return util.fetchWithRetry(url, {}, MAX_RETRIES, RETRY_INTERVAL)
  .then(resp=>resp.json());
}

function sendLicensingUpdate() {
  logger.log('licensing - sending storage licensing update', storageIsAuthorized);
  if (storageIsAuthorized === null) {
    return;
  }

  const message = {
    from: 'licensing',
    topic: 'storage-licensing-update',
    isAuthorized: storageIsAuthorized
  };

  viewerMessaging.send(message);
}

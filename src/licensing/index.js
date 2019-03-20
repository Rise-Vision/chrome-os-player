/* eslint-disable max-statements */
const viewerMessaging = require('../messaging/viewer-messaging');
const store = require('./store');
const storageLocalMessaging = require('../storage/messaging/local-messaging-helper');
const storageMessaging = require('../storage/messaging/messaging');
const fileSystem = require('../storage/file-system')
const systemInfo = require('../logging/system-info');
const logger = require('../logging/logger');
const util = require('../util');

const displayConfigBucket = 'risevision-display-notifications';
const productCodes = {
  "rpp": "c4b368be86245bf9501baaa6e0b00df9719869fd"
};

const subscriptions = {};
let displayId = null;
let authorizationStatusListener = () => {}; // eslint-disable-line func-style

function init() {
  viewerMessaging.on('licensing-request', sendLicensingUpdate);

  storageLocalMessaging.registerLocalListener(updateProductAuth);
  store.init();

  chrome.storage.onChanged.addListener(updateDisplayIdAndResubmitWatch);

  return viewerMessaging.viewerCanReceiveContent()
  .then(systemInfo.getDisplayId)
  .then(id=>displayId = id)
  .then(submitWatchForProductAuthChanges);
}

function onAuthorizationStatus(listener) {
  authorizationStatusListener = listener;
  notifyAuthorizationStatusListener();
}

function notifyAuthorizationStatusListener() {
  const values = util.objectValues(subscriptions);
  if (values.length === 0) {
    return;
  }

  const isAuthorized = util.objectValues(subscriptions).some(subscription => subscription === true);
  authorizationStatusListener(isAuthorized);
}

function updateDisplayIdAndResubmitWatch(changes, area) {
  if (area !== 'local' || !changes.displayId) {return;}

  displayId = changes.displayId.newValue;
  submitWatchForProductAuthChanges();
}

function submitWatchForProductAuthChanges() {
  if (!displayId) {return;}

  const filePaths = products().map(code=>{
    return `${displayConfigBucket}/${displayId}/authorization/${code}.json`;
  });

  filePaths.forEach(filePath=>{
    logger.log(`licensing - submitting watch for ${filePath}`);
    storageMessaging.handleWatch({
      from: 'licensing',
      topic: 'WATCH',
      filePath
    });
  });
}

function updateProductAuth({topic, status, filePath, ospath} = {}) {
  if (!filePath || !filePath.startsWith(displayConfigBucket)) {return}
  if (topic !== 'FILE-UPDATE') {return}
  if (status !== 'CURRENT' && status !== 'NOEXIST') {return}
  if (!aProductAuthFileWasChanged()) {return}

  const productCode = products().find(prodCode=>{
    return filePath.includes(prodCode);
  });

  const objectPromise = status === 'CURRENT' ? fileSystem.readCachedFileAsObject(ospath.split("/").pop()) : Promise.resolve({[productCode]: false});

  return objectPromise
  .then(obj=>{
    subscriptions[productCode] = obj.authorized;
    logger.log(`licensing - authorization set to ${JSON.stringify(subscriptions)}`);
  })
  .then(sendLicensingUpdate)
  .then(notifyAuthorizationStatusListener)
  .catch(err=>{
    logger.error('licensing - error on updating product authorization', err);
    console.error(Error(err.message))
  });

  function aProductAuthFileWasChanged() {
    return products().some(prodCode=>{
      return filePath.includes(prodCode);
    });
  }
}

function sendLicensingUpdate() {
  logger.log('licensing - sending licensing update', subscriptions);

  const message = {
    from: 'licensing',
    topic: 'licensing-update',
    subscriptions
  };

  viewerMessaging.send(message);
}

function products() {
  return util.objectValues(productCodes);
}

module.exports = {
  init,
  onAuthorizationStatus
};

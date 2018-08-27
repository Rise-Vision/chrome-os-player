const viewerInjector = require('./viewer-injector');
const viewerMessaging = require('./messaging/viewer-messaging');
const contentLoader = require('./content-loader');
const logger = require('./logging/logger');
const offlineSubscriptionCheck = require('./logging/offline-subscription-check');
const messaging = require('./messaging/messaging-service-client');
const storage = require('./storage/storage');
const licensing = require('./licensing');
const debugDataRequest = require('./messaging/debug-data-request');
const rebootScheduler = require('./reboot-scheduler');
const orientation = require('./orientation');
const fileServer = require('./storage/file-server');
const launchEnv = require('./launch-environment');
const screenshot = require('./screenshot');

function setUpMessaging() {
  const webview = document.querySelector('webview');
  viewerMessaging.init(webview);

  webview.addEventListener('loadstart', (evt) => {
    if (!evt.isTopLevel) {return;}
    if (!evt.url.match(/http[s]?:\/\/viewer(?:-test)?.risevision.com/)) {return;}
    webview.executeScript({code: viewerInjector.generateMessagingSetupFunction()}, ()=>{
      viewerMessaging.send({from: 'player', topic: 'latch-app-window'});
    });
  });

  setupWebviewEvents(webview);

  messaging.on('content-update', fetchContent);
  messaging.on('reboot-request', () => rebootScheduler.rebootNow());
  messaging.on('restart-request', () => rebootScheduler.restart());
  messaging.on('screenshot-request', (request) => screenshot.handleRequest(webview, request));
  viewerMessaging.on('viewer-config', (viewerConfig) => {
    logger.log('viewer config received', viewerConfig);
    offlineSubscriptionCheck.isSubscribed().then(isSubscribed => logger.logClientInfo(viewerConfig, isSubscribed));
  });

  return messaging.init()
  .catch(() => logger.log('MS connection failed on init'));
}

function setupWebviewEvents(webview) {
  webview.addEventListener('loadabort', evt => logger.error('viewer webview load aborted', null, {code: evt.code, reason: evt.reason}));
  webview.addEventListener('unresponsive', () => logger.error('viewer webview unresponsive'));
  webview.addEventListener('permissionrequest', evt => {
    logger.log('viewer webview premission requested', evt.permission);
    if (evt.permission === 'geolocation' || evt.permission === 'loadplugin') {
      evt.request.allow();
    } else {
      evt.request.deny();
    }
  });
}

function fetchContent() {
  Promise.all([contentLoader.loadContent(), viewerMessaging.viewerCanReceiveContent()]).then((values) => {
    const [contentData] = values;
    logger.log('sending content to viewer', contentData);
    viewerMessaging.send({from: 'player', topic: 'content-update', newContent: contentData});
    rebootScheduler.scheduleRebootFromViewerContents(contentData);
    orientation.setupOrientation(contentData);
  })
  .catch((error) => logger.error('error when fetching content', error));
}

function init() {
  launchEnv.init().then(() => {
    setUpMessaging()
      .then(storage.init)
      .then(licensing.init)
      .then(debugDataRequest.init)
      .catch(error => logger.error('error when initilizing modules', error));
    fileServer.init();
    fetchContent();
  });
}

document.addEventListener('DOMContentLoaded', init);

const viewerInjector = require('./viewer-injector');
const viewerMessaging = require('./messaging/viewer-messaging');
const contentLoader = require('./content-loader');
const logger = require('./logging/logger');
const messaging = require('./messaging/messaging-service-client');
const storage = require('./storage/storage');
const licensing = require('./licensing');
const rebootScheduler = require('./reboot-scheduler');
const fileServer = require('./storage/file-server');

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

  setupLogEvents(webview);

  messaging.on('content-update', fetchContent);
  messaging.on('reboot-request', () => rebootScheduler.rebootNow());
  messaging.on('restart-request', () => rebootScheduler.restart());
  viewerMessaging.on('viewer-config', logger.logClientInfo);

  return messaging.init();
}

function setupLogEvents(webview) {
  webview.addEventListener('loadabort', evt => logger.error('viewer webview load aborted', null, {code: evt.code, reason: evt.reason}));
  webview.addEventListener('unresponsive', () => logger.error('viewer webview unresponsive'));
  webview.addEventListener('permissionrequest', evt => logger.log('viewer webview premission requested', evt.permission));
}

function fetchContent() {
  Promise.all([contentLoader.loadContent(), viewerMessaging.viewerCanReceiveContent()]).then((values) => {
    const [contentData] = values;
    logger.log('sending content to viewer', contentData);
    viewerMessaging.send({from: 'player', topic: 'content-update', newContent: contentData});
    rebootScheduler.scheduleRebootFromViewerContents(contentData);
  })
  .catch((error) => logger.error('error when fetching content', error));
}

function init() {
  setUpMessaging()
    .then(storage.init)
    .then(licensing.init)
    .catch(error => logger.error('error when initilizing modules', error));
  fileServer.init();
  fetchContent();
}

document.addEventListener('DOMContentLoaded', init);

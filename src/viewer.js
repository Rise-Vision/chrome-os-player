const viewerInjector = require('./viewer-injector');
const viewerMessaging = require('./viewer-message-handler');
const contentLoader = require('./content-loader');
const logger = require('./logging/logger');
const messaging = require('./messaging/messaging-service-client');
const storage = require('./storage/storage');
const rebootScheduler = require('./reboot-scheduler');
const fileServer = require('./storage/file-server');
// const fileDownloader = require('./storage/file-downloader');

function setUpMessaging() {
  const webview = document.querySelector('webview');
  viewerMessaging.init(webview);

  window.addEventListener('message', (event) => {
    if (!event.data) {
      return;
    }

    event.preventDefault();

    console.log(`viewer window received message from webview: ${JSON.stringify(event.data)}`);
    viewerMessaging.handleMessage(event.data);
  });

  webview.addEventListener('loadstart', (evt) => {
    if (!evt.isTopLevel) {return;}
    if (!evt.url.match(/http[s]?:\/\/viewer(?:-test)?.risevision.com/)) {return;}
    webview.executeScript({code: viewerInjector.generateMessagingSetupFunction()}, ()=>{
      viewerMessaging.sendMessage({from: "player", topic: "latch-app-window"});
    });
  });

  messaging.on('content-update', fetchContent);

  return messaging.init();
}

function fetchContent() {
  Promise.all([contentLoader.fetchContent(), viewerMessaging.viewerCanReceiveContent()]).then((values) => {
    logger.log('sending content to viewer');
    const [contentData] = values;
    viewerMessaging.sendMessage({from: 'player', topic: 'content-update', newContent: contentData});
    rebootScheduler.scheduleRebootFromViewerContents(contentData);
  });
}

function init() {
  setUpMessaging().then(storage.init);
  fetchContent();
  fileServer.init();
  // fileDownloader.downloadUrl('https://raw.githubusercontent.com/Rise-Vision/chrome-os-player/master/README.md', 'README.md');
  // fileDownloader.downloadUrl('https://storage.googleapis.com/rise-andre/ten_mega.png', 'ten_mega.png');
  // fileDownloader.downloadUrl('https://storage.googleapis.com/rise-andre/one_and_a_half_gig.mp4', 'one_and_a_half_gig.mp4');
}

document.addEventListener('DOMContentLoaded', init);

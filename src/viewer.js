const viewerInjector = require('./viewer-injector');
const viewerMessaging = require('./viewer-message-handler');
const contentLoader = require('./content-loader');

function init() {
  window.addEventListener('message', (event) => {
    if (!event.data) {
      return;
    }

    event.preventDefault();

    console.log(`viewer window received message from webview: ${JSON.stringify(event.data)}`);
    viewerMessaging.handleMessage(event.data);
  });

  const webview = document.querySelector('webview');
  webview.addEventListener('contentload', () => {
    webview.executeScript({code: viewerInjector.generateMessagingSetupFunction()});
    webview.contentWindow.postMessage({from: 'player', topic: 'hello'}, webview.src);
  });

  Promise.all([contentLoader.fetchContent(), viewerMessaging.viewerCanReceiveContent()]).then((values) => {
    const [contentData] = values;
    webview.contentWindow.postMessage({from: 'player', topic: 'content-update', newContent: contentData}, webview.src);
  });
}

document.addEventListener("DOMContentLoaded", init);

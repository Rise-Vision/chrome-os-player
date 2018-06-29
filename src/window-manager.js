/* eslint-disable no-magic-numbers */
function startRegistration() {
  const options = {
    id: 'registration',
    outerBounds: getDefaultScreenBounds()
  };

  chrome.app.window.create('registration.html', options);
}

function launchViewer(displayId) {
  const previousWindow = chrome.app.window.current();
  const url = `http://viewer-test.risevision.com/Viewer.html?player=true&type=display&id=${displayId}`;

  chrome.power.requestKeepAwake('display');
  return createWebViewWindow('viewer.html', url, {id: 'viewer', state: 'fullscreen'})
    .then((viewerWindow) => {
      viewerWindow.onClosed.addListener(() => chrome.power.releaseKeepAwake());
      previousWindow.close();
    });
}

function launchWebView(url) {
  createWebViewWindow('webview.html', url);
}

function closeAll() {
  const windows = chrome.app.window.getAll();
  windows.forEach(win => win.close());
}

function closeCurrentWindow() {
  const current = chrome.app.window.current();
  current.close();
}

function createWebViewWindow(file, url, options = {}) {
  const defaultOptions = {outerBounds: getDefaultScreenBounds()};
  return new Promise((resolve) => {
    chrome.app.window.create(file, Object.assign(defaultOptions, options), (appWin) => {
      appWin.contentWindow.addEventListener('DOMContentLoaded', () => {
        const webview = appWin.contentWindow.document.querySelector('webview');
        webview.addEventListener("error", (err)=>{
          console.error(err);
        });
        webview.src = url;
      });
      resolve(appWin);
    });
  });
}

function getDefaultScreenBounds() {
  // Center window on screen.
  const screenWidth = screen.availWidth;
  const screenHeight = screen.availHeight;
  const width = Math.round(screenWidth * 0.9);
  const height = Math.round(screenHeight * 0.9);
  return {
    width,
    height,
    left: Math.round((screenWidth - width) / 2),
    top: Math.round((screenHeight - height) / 2)
  };
}

module.exports = {
  startRegistration,
  launchViewer,
  launchWebView,
  closeAll,
  closeCurrentWindow
}

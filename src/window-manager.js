/* eslint-disable no-magic-numbers */
function startRegistration() {
  const options = {
    id: 'registration',
    outerBounds: getDefaultScreenBounds()
  };

  chrome.app.window.create('registration.html', options);
}

function launchContent() {
  const previousWindow = chrome.app.window.current();

  chrome.power.requestKeepAwake('display');
  chrome.app.window.create('content.html', {outerBounds: getDefaultScreenBounds(), state: 'fullscreen'}, (appWin) => {
    appWin.onClosed.addListener(() => chrome.power.releaseKeepAwake());
    previousWindow.close();
  });
}

function launchWebView(url) {
  createWebViewWindow('webview.html', url).then((webViewWindow) => {
    webViewWindow.contentWindow.addEventListener('DOMContentLoaded', () => {
      const closeButton = webViewWindow.contentWindow.document.getElementById('close-webview');
      closeButton.addEventListener('click', () => {
        webViewWindow.close();
      });
    });
  });
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
        resolve(appWin);
      });
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
  launchContent,
  launchWebView,
  closeAll,
  closeCurrentWindow
}

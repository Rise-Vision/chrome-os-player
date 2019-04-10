const windowManager = require('./window-manager');
const logger = require('./logging/logger');
const launchEnvs = require('./launch-environment');
const displayIdServer = require('./marketwall/display-id-server');

function init(launchData) {
  const manifest = chrome.runtime.getManifest();
  logger.log(`received launch data for ${manifest.version} via ${launchData.source}`, launchData);
  launchEnvs.set(launchData);

  windowManager.startRegistration();

  displayIdServer.init();

  chrome.runtime.requestUpdateCheck((status, details) => logger.log(`update check result: ${status}`, details));
}

chrome.runtime.onUpdateAvailable.addListener((details) => {
  logger.log('update is available', details);
  chrome.runtime.restart();
});

chrome.app.runtime.onLaunched.addListener(init);

chrome.runtime.onRestartRequired.addListener(() => {
  logger.log('restart required, closing all windows');
  windowManager.closeAll();
});

chrome.runtime.onInstalled.addListener(details => logger.log('app has been installed', details));
chrome.runtime.onSuspend.addListener(() => logger.log('app has been suspended'));

window.addEventListener('online', () => logger.log('online event triggered'));
window.addEventListener('offline', () => logger.log('offline event triggered'));

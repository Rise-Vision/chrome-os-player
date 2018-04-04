const windowManager = require('./window-manager');
const logger = require('./logging/logger');
const launchEnvs = require("./launch-environment");

function init(launchData) {
  logger.log(`launch from ${launchData.source}`, launchData);
  launchEnvs.set(launchData);

  chrome.storage.local.get((items) => {
    if (items.displayId) {
      windowManager.launchViewer(items.displayId);
    } else {
      windowManager.startRegistration();
    }
  });

  chrome.runtime.requestUpdateCheck((status, details) => logger.log(`update check result: ${status}`, details));
}

chrome.runtime.onUpdateAvailable.addListener((details) => {
  logger.log('update is availeble', details);
  chrome.runtime.restart();
});

chrome.app.runtime.onLaunched.addListener(init);

chrome.runtime.onRestartRequired.addListener(() => windowManager.closeAll());

chrome.power.requestKeepAwake('display');

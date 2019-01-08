const messaging = require('../messaging/messaging-service-client');
const windowManager = require('../window-manager');

function saveDisplayIdAndLaunchContent(displayId) {
  chrome.storage.local.set({displayId});
  chrome.storage.local.remove('content');

  return windowManager.launchContent();
}

function init(document, displayIdValidator) {
  messaging.init().then(() => console.log('MS init'));
  messaging.on('display-activation', ({displayId}) => {
    displayIdValidator(displayId)
      .then(() => saveDisplayIdAndLaunchContent(displayId))
      .catch(() => console.error('Cannot activate. Invalid display id.', displayId));
  });
}

module.exports = {
  init
}

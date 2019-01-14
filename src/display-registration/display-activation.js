const messaging = require('../messaging/messaging-service-client');
const activationService = require('./activation-service');
const windowManager = require('../window-manager');

function createViewModel(document) {
  const activationCodeText = document.getElementById("activationCode");
  return {
    showActivationCode(code) {
      activationCodeText.innerHTML = code;
    }
  };
}

function saveDisplayIdAndLaunchContent(displayId) {
  chrome.storage.local.set({displayId});
  chrome.storage.local.remove('content');

  return windowManager.launchContent();
}

function init(document) {
  messaging.init().then(() => console.log('MS init'));
  messaging.on('display-activation', ({displayId}) => {
    // eslint-disable-next-line no-magic-numbers
    setTimeout(() => saveDisplayIdAndLaunchContent(displayId), 2000);
  });

  const viewModel = createViewModel(document);
  activationService.fetchActivationCode().then(code => viewModel.showActivationCode(code));
}

module.exports = {
  init
}

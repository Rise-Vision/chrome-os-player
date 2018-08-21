/* eslint-disable max-statements */
const windowManager = require('../window-manager');
const launchEnv = require('../launch-environment');
const networkChecks = require('../network-checks');

function createViewModel(document) {

  const form = document.querySelector('form');
  const links = document.querySelectorAll('a.webview');
  const cancelButton = document.getElementById('cancel');

  links.forEach(link => {
    link.addEventListener('click', evt => {
      evt.preventDefault();
      windowManager.launchWebView(link.href);
    });
  });

  cancelButton.addEventListener('click', evt => {
    evt.preventDefault();
    windowManager.closeCurrentWindow();
  });

  function setupInfoMessage() {
    const nonKioskDisclaimer = document.getElementById('nonKioskDisclaimer');
    if (launchEnv.isKioskSession()) {
      nonKioskDisclaimer.remove();
    }
  }

  function loadSavedDisplayId() {
    chrome.storage.local.get(items => {
      if (items.displayId) {
        document.getElementById('displayIdInput').value = items.displayId;
      }
    });
  }

  setupInfoMessage();
  loadSavedDisplayId();

  function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorSection = document.getElementById('errorSection');
    const input = form.querySelector('input');

    errorSection.hidden = false;
    input.className = `${input.className} has-error`;
    errorMessage.innerHTML = message;
  }

  function showNetworkError(message) {
    const errorSection = document.getElementById('networkErrorSection');
    const errorMessage = document.getElementById('networkErrorMessage');

    errorSection.hidden = false;
    errorMessage.innerHTML = message;
  }

  return {
    bindRegistrationControllerFunction(fn) {
      form.onsubmit = (ev) => {
        ev.preventDefault();
        fn(...getInputs());
      }

      function getInputs() {
        return Array.from(form.querySelectorAll('input')).map(elm=>elm.value);
      }
    },

    disableContinue() {
      document.getElementById('continue').setAttribute('disabled', '');
    },

    showEmptyDisplayIdError() {
      showError('Display ID is missing. ');
    },

    showEmptyClaimIdError() {
      showError('Claim ID is missing. ');
    },

    showMissingDisplayNameError() {
      showError('Display name is missing. ');
    },

    showInvalidClaimIdError(id) {
      showError(`The Claim ID <b>${id}</b> is invalid. `);
    },

    showInvalidDisplayIdError(displayId) {
      showError(`The Display ID <b>${displayId}</b> is invalid. `);
    },

    showNetworkError(err) {
      const messageEnd = err.message.startsWith("http") ?
        err.message.split(" ")[0] :
        'required network sites';

      showNetworkError(`Could not connect to ${messageEnd}. `);
    },

    showNetworkWaiting() {
      showNetworkError('Waiting for network checks');
    },

    launchViewer(displayId) {
      windowManager.launchViewer(displayId)
    }
  }
}


function normalizeDisplayId(id) {
  const LEGACY_ID_REGEX = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
  return id.match(LEGACY_ID_REGEX) ? id.toLowerCase() : id.toUpperCase().trim();
}

function createController(viewModel, registrationService) {

  function saveDisplayIdAndLaunchViewer(displayId) {
    chrome.storage.local.set({displayId});
    chrome.storage.local.remove('content');

    viewModel.disableContinue();

    if (!networkChecks.haveCompleted()) {viewModel.showNetworkWaiting()}

    return networkChecks.getResult()
    .then(() => viewModel.launchViewer(displayId))
    .catch((err) => viewModel.showNetworkError(err));
  }

  const controller = {
    validateDisplayId(typedDisplayId) {
      if (!typedDisplayId) {
        viewModel.showEmptyDisplayIdError();
        return Promise.reject(Error('empty display id'));
      }

      const displayId = normalizeDisplayId(typedDisplayId);

      return registrationService(displayId)
        .then(() => saveDisplayIdAndLaunchViewer(displayId))
        .catch(() => viewModel.showInvalidDisplayIdError(typedDisplayId));
    },
    submitClaimId(id, name) {
      if (!id) {
        viewModel.showEmptyClaimIdError();
        return;
      }

      if (!name) {
        viewModel.showMissingDisplayNameError();
        return;
      }

      return registrationService(id, name)
      .then(displayId => saveDisplayIdAndLaunchViewer(displayId))
      .catch(() => viewModel.showInvalidClaimIdError(id));
    }
  };

  return controller;
}

function init(document, registrationService) {
  const viewModel = createViewModel(document);

  return [
    viewModel,
    createController(viewModel, registrationService)
  ];
}

module.exports = {
  createViewModel,
  createController,
  init
}

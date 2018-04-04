const windowManager = require('./window-manager');

function createViewModel(document) {

  const form = document.querySelector('form');
  const cont = document.querySelector('#continue');
  const links = document.querySelectorAll('a');

  links.forEach(link => {
    if (link.href.startsWith('file') || link.href.startsWith('chrome')) {return;}

    link.addEventListener('click', evt => {
      evt.preventDefault();
      windowManager.launchWebViewFromWebview(link.href);
    });
  });

  function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorSection = document.getElementById('errorSection');
    const input = form.querySelector('input');

    errorSection.hidden = false;
    input.className = `${input.className} has-error`;
    errorMessage.innerHTML = message;
  }

  return {
    bindRegistrationControllerFunction(fn) {
      cont.addEventListener("click", ()=>fn(...getInputs()));

      form.onsubmit = (ev) => {
        ev.preventDefault();
        fn(...getInputs());
      }

      function getInputs() {
        return Array.from(form.querySelectorAll('input')).map(elm=>elm.value);
      }
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

    launchViewer(displayId) {
      windowManager.launchViewer(displayId)
    }
  }
}

function createController(viewModel, registrationService) {
  const controller = {
    validateDisplayId(displayId) {
      if (!displayId) {
        viewModel.showEmptyDisplayIdError();
        return Promise.reject(Error('empty display id'));
      }

      return registrationService(displayId)
        .then(() => chrome.storage.local.set({displayId}))
        .then(() => viewModel.launchViewer(displayId))
        .catch(() => viewModel.showInvalidDisplayIdError(displayId));
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
      .then(displayId=>{
        chrome.storage.local.set({displayId});
        viewModel.launchViewer(displayId);
      })
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

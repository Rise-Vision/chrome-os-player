const windowManager = require('./window-manager');

function createViewModel(document) {

  const form = document.querySelector('form');
  const cont = document.querySelector('#continue');
  const links = document.querySelectorAll('a');

  links.forEach(link => {
    link.addEventListener('click', evt => {
      evt.preventDefault();
      windowManager.launchWebView(link.href);
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
    bindValidateDisplayId(handler) {
      cont.addEventListener("click", ()=>handler(displayId()));

      form.onsubmit = (ev) => {
        ev.preventDefault();
        handler(displayId());
      }

      function displayId() {
        return form.querySelector('input').value.toUpperCase().trim();
      }
    },

    showEmptyDisplayIdError() {
      showError('Display ID is missing. ');
    },

    showInvalidDisplayIdError(displayId) {
      showError(`The Display ID <b>${displayId}</b> is invalid. `);
    },

    launchViewer(displayId) {
      windowManager.launchViewer(displayId)
    }
  }
}

function createController(viewModel, validator) {
  const controller = {
    validateDisplayId(displayId) {
      if (!displayId) {
        viewModel.showEmptyDisplayIdError();
        return Promise.reject(Error('empty display id'));
      }

      return validator.validateDisplayId(displayId)
        .then(() => chrome.storage.local.set({displayId}))
        .then(() => viewModel.launchViewer(displayId))
        .catch(() => viewModel.showInvalidDisplayIdError(displayId));
    }
  };

  viewModel.bindValidateDisplayId(controller.validateDisplayId.bind(controller));

  return controller;
}

function init(document, validator) {
  const viewModel = createViewModel(document);
  return createController(viewModel, validator);
}

module.exports = {
  createViewModel,
  createController,
  init
}

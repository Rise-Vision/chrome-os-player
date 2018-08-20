const windowManager = require('../window-manager');
const networkChecks = require('../network-checks');
const launchEnv = require('../launch-environment');

function createViewModel(document) { // eslint-disable-line max-statements

  const secondsRemaining = document.getElementById('secondsRemaining');
  const secondsText = document.getElementById('secondsText');
  const networkErrorSection = document.getElementById('networkErrorSection');
  const networkErrorMessage = document.getElementById('networkErrorMessage');
  const actions = document.querySelectorAll('a, button');
  const continueButton = document.getElementById('continue');
  const cancelButton = document.getElementById('cancel');
  const links = document.querySelectorAll('a.webview');

  function setupInfoMessage() {
    const nonKioskDisclaimer = document.getElementById('nonKioskDisclaimer');
    if (launchEnv.isKioskSession()) {
      nonKioskDisclaimer.remove();
    }
  }

  setupInfoMessage();

  return {
    showNetworkError(message) {
      const messageEnd = message.startsWith("http") ?
        message.split(" ")[0] :
        'required network sites';

      continueButton.innerHTML = 'Skip';
      networkErrorMessage.innerHTML = `Could not connect to ${messageEnd}.`;
      networkErrorSection.removeAttribute('hidden');
    },
    bindController(controller) {
      links.forEach(link => {
        link.addEventListener('click', evt => {
          evt.preventDefault();
          controller.launchWebView(link.href);
        });
      });

      actions.forEach(action => {
        action.addEventListener('click', evt => {
          evt.preventDefault();
          controller.stopCountdown();
        });
      });

      continueButton.addEventListener('click', evt => {
        evt.preventDefault();
        controller.continue();
      });

      cancelButton.addEventListener('click', evt => {
        evt.preventDefault();
        controller.cancel();
      });
    },

    updateSecondsRemaining(seconds) {
      secondsRemaining.innerText = seconds;
      if (seconds === 1) {
        secondsText.innerText = 'second.';
      }
    }
  }
}

function createController(viewModel, displayId) {

  const controller = {
    stopCountdown() {
      clearInterval(runningTimer);
    },

    launchWebView(url) {
      windowManager.launchWebView(url);
    },

    continue() {
      return networkChecks.getResult()
      .then(()=>windowManager.launchViewer(displayId))
      .catch(err=>{
        if (skipNetworkError) {
          return windowManager.launchViewer(displayId);
        }

        viewModel.showNetworkError(err.message)
        runningTimer = startCountdown(60); // eslint-disable-line no-magic-numbers
        skipNetworkError = true;
      })
    },

    cancel() {
      windowManager.closeCurrentWindow();
    }
  };

  const ONE_SECOND = 1000;
  let runningTimer = startCountdown(10); // eslint-disable-line no-magic-numbers
  let skipNetworkError = false;

  function startCountdown(secs) {
    let seconds = secs;

    return setInterval(setSeconds, ONE_SECOND);

    function setSeconds() {
      seconds -= 1;
      if (seconds === 0) {
        controller.stopCountdown();
        controller.continue();
      } else {
        viewModel.updateSecondsRemaining(seconds);
      }
    }
  }

  return controller;
}

function init(document, displayId) {
  const viewModel = createViewModel(document);
  const controller = createController(viewModel, displayId);
  viewModel.bindController(controller);

  return [
    viewModel,
    controller
  ];
}

module.exports = {
  createViewModel,
  createController,
  init
}

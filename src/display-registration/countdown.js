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

  function showErrorBox() {
    continueButton.innerHTML = 'Skip';
    networkErrorSection.hidden = false;
    secondsRemaining.className = 'countdown-digits-danger text-danger';
  }

  setupInfoMessage();

  return {
    showNetworkWaiting() {
      networkErrorMessage.innerHTML = 'Waiting for network checks';
      showErrorBox();
    },

    showNetworkError(message) {
      const specificSite = message.startsWith("http");
      const genericError = 'required network sites';
      const messageEnd = specificSite ? message.split(" ")[0] : genericError;

      networkErrorMessage.innerHTML = `Could not connect to ${messageEnd}.`;
      showErrorBox();
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
      secondsText.innerText = seconds === 1 ? 'second' : 'seconds';
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
      if (skipNetworkError) {return windowManager.launchPlayer(displayId)}
      skipNetworkError = true;

      if (!networkChecks.haveCompleted()) {
        viewModel.showNetworkWaiting();
        runningTimer = startCountdown(networkChecks.secondsRemaining());
      }

      return networkChecks.getResult()
      .then(()=>windowManager.launchPlayer(displayId))
      .catch(err=>{
        if (err.message === 'network-check-timeout') {
          return windowManager.launchPlayer(displayId);
        }

        viewModel.showNetworkError(err.message);
        clearInterval(runningTimer);
        runningTimer = startCountdown(SIXTY_SECONDS);
      })
    },

    cancel() {
      windowManager.closeCurrentWindow();
    }
  };

  const ONE_SECOND_MILLIS = 1000;
  const TEN_SECONDS = 10;
  const SIXTY_SECONDS = 60;
  let runningTimer = startCountdown(TEN_SECONDS);
  let skipNetworkError = false;

  function startCountdown(secs) {
    let seconds = secs;

    return setInterval(setSeconds, ONE_SECOND_MILLIS);

    function setSeconds() {
      seconds -= 1;
      viewModel.updateSecondsRemaining(seconds);

      if (seconds === 0) {
        controller.stopCountdown();
        controller.continue();
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

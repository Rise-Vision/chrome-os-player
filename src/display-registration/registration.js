const displayActivationHtml = require('./display-activation.html');
const displayActivationScreen = require('./display-activation');
const displayIdHtml = require('./display-id.html');
const displayIdValidator = require('./display-id-validator');
const claimIdHtml = require('./claim-id.html');
const networkChecks = require('../network-checks');
const claimIdSubmittor = require('./claim-id-submittor');
const displayRegistrationScreen = require('./display-registration');
const countdownHtml = require('./countdown.html');
const spinnerHtml = require('./spinner.html');
const spinnerScreen = require('./spinner');
const networkErrorHtml = require('./network-error.html');
const networkErrorScreen = require('./network-error');
const countdownScreen = require('./countdown');
const contentLoader = require('../content-loader');
const logger = require('../logging/logger');
const launchEnv = require('../launch-environment');

function init() {
  const body = document.querySelector('body');

  function goToDisplayId(invalidDisplayId) {
    logger.log('showing display id screen', invalidDisplayId);
    body.innerHTML = displayIdHtml;
    const [viewModel, controller] = displayRegistrationScreen.init(document, displayIdValidator);
    viewModel.bindRegistrationControllerFunction(controller.validateDisplayId.bind(controller));
    viewModel.showSpinner = showSpinner;
    viewModel.showNetworkError = showNetworkError;
    const claimIdLink = document.getElementById('claimIdLink');
    claimIdLink.addEventListener('click', (event) => {
      event.preventDefault();
      goToClaimId();
    });

    if (invalidDisplayId) {
      viewModel.showInvalidDisplayIdError(invalidDisplayId);
    }
  }

  function goToClaimId() {
    logger.log('showing claim id screen');
    body.innerHTML = claimIdHtml;
    const [viewModel, controller] = displayRegistrationScreen.init(document, claimIdSubmittor);
    viewModel.bindRegistrationControllerFunction(controller.submitClaimId.bind(controller));
    viewModel.showSpinner = showSpinner;
    viewModel.showNetworkError = showNetworkError;
    const displayIdLink = document.getElementById('displayIdLink');
    displayIdLink.addEventListener('click', (event) => {
      event.preventDefault();
      goToDisplayId();
    });
  }

  function goToActivation() {
    logger.log('showing display activation screen');
    body.innerHTML = displayActivationHtml;
    displayActivationScreen.init(document, displayIdValidator);
    const displayIdLink = document.getElementById('displayIdLink');
    displayIdLink.addEventListener('click', (event) => {
      event.preventDefault();
      goToDisplayId();
    });
  }

  function showCountdown(displayId) {
    logger.log('showing countdown screen');
    body.innerHTML = countdownHtml;
    const [_, controller] = countdownScreen.init(document, displayId); // eslint-disable-line no-unused-vars
    const displayIdLink = document.getElementById('displayIdLink');
    displayIdLink.addEventListener('click', (event) => {
      event.preventDefault();
      goToDisplayId();
    });
    return controller;
  }

  function showSpinner() {
    logger.log('showing spinner');
    body.innerHTML = spinnerHtml;
    spinnerScreen.init(document);
  }

  function showNetworkError(err, displayId) {
    logger.log('showing network error');
    body.innerHTML = networkErrorHtml;
    const controller = networkErrorScreen.init(document, err);
    controller.goToDisplayId = goToDisplayId;
    controller.displayId = displayId;
  }

  chrome.storage.local.get((items) => {
    if (items.displayId) {
      const countDownController = showCountdown(items.displayId);
      contentLoader.fetchContent().then(data => {
        if (!data) {
          goToDisplayId(items.displayId);
          countDownController.stopCountdown();
        }
      });
    } else {
      goToActivation();
    }
  });

  networkChecks.checkSites()
  .catch(err => logger.error('network check error', err));
}

window.addEventListener('DOMContentLoaded', () => {
  launchEnv.init().then(init);
});

const displayIdHtml = require('./display-id.html');
const displayIdValidator = require('./display-id-validator');
const claimIdHtml = require('./claim-id.html');
const claimIdSubmittor = require('./claim-id-submittor');
const screen = require('./display-registration');

window.addEventListener('DOMContentLoaded', () => {
  const body = document.querySelector('body');

  function goToDisplayId() {
    body.innerHTML = displayIdHtml;
    const [viewModel, controller] = screen.init(document, displayIdValidator);
    viewModel.bindRegistrationControllerFunction(controller.validateDisplayId.bind(controller));
    const claimIdLink = document.getElementById('claimIdLink');
    claimIdLink.addEventListener('click', (event) => {
      event.preventDefault();
      goToClaimId();
    });
  }

  function goToClaimId() {
    body.innerHTML = claimIdHtml;
    const [viewModel, controller] = screen.init(document, claimIdSubmittor);
    viewModel.bindRegistrationControllerFunction(controller.submitClaimId.bind(controller));
    const displayIdLink = document.getElementById('displayIdLink');
    displayIdLink.addEventListener('click', (event) => {
      event.preventDefault();
      goToDisplayId();
    });
  }

  goToDisplayId();
});

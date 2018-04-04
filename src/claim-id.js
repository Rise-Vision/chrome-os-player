const windowManager = require("./window-manager");
const submittor = require('./claim-id-submittor');
const screen = require('./display-registration');

function init() {
  const [viewModel, controller] = screen.init(document, submittor);
  viewModel.bindRegistrationControllerFunction(controller.submitClaimId.bind(controller));

  window.addEventListener("message", (evt)=>{
    windowManager.setParentWindow(evt.source);
  });
}

document.addEventListener("DOMContentLoaded", init);

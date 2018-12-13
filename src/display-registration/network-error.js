const windowManager = require('../window-manager');
const networkChecks = require('../network-checks');

function createViewModel(document, err, controller) {
  const tryAgainButton = document.getElementById('tryAgain');
  const continueButton = document.getElementById('continueAnyway');
  const links = document.querySelectorAll('a.webview');

  links.forEach(link => {
    link.addEventListener('click', evt => {
      evt.preventDefault();
      windowManager.launchWebView(link.href);
    });
  });

  showNetworkError();

  function showNetworkError() {
    const messageDetailElement = document.getElementById('messageDetail');
    const messageDetail = err.message.startsWith("http") ?
      err.message.split(" ")[0] :
      'required network sites';

    messageDetailElement.innerHTML = `Could not connect to ${messageDetail}`;
  }

  tryAgainButton.addEventListener("click", evt=>{
    evt.preventDefault();
    controller.tryAgain();
  });

  continueButton.addEventListener("click", evt=>{
    evt.preventDefault();
    windowManager.launchContent();
  });
}

function createController() {
  const controller = {
    tryAgain() {
      networkChecks.retry();
      controller.goToDisplayId();
    }
  };

  return controller;
}

function init(document, err) {
  const controller = createController();

  createViewModel(document, err, controller);

  return controller;
}

module.exports = {
  init
}

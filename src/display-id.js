const validator = require('./display-id-validator');
const screen = require('./display-registration');

function init() {
  screen.init(document, validator);
}

document.addEventListener("DOMContentLoaded", init);

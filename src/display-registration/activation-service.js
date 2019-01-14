const systemInfo = require('../logging/system-info');

const activationServiceUrl = 'https://display-activation-poc.appspot.com';

function fetchActivationCode() {
  return systemInfo.getMachineId()
    .then(machineId => fetch(`${activationServiceUrl}/activation?machineId=${machineId}`))
    .then(response => response.json())
    .then(json => json.code);
}

module.exports = {
  fetchActivationCode
}

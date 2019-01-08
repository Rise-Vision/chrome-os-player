const systemInfo = require('../logging/system-info');

const activationServiceUrl = 'http://127.0.0.1:9191';

function fetchActivationCode() {
  return systemInfo.getMachineId()
    .then(machineId => fetch(`${activationServiceUrl}/activation?machineId=${machineId}`))
    .then(response => response.json())
    .then(json => json.code);
}

module.exports = {
  fetchActivationCode
}

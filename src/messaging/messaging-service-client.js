const Primus = require('./primus');
const logger = require('../logging/logger');

function connect(displayId, machineId) {
  const url = `https://services.risevision.com/messaging/primus/?displayId=${displayId}&machineId=${machineId}`;
  const connection = Primus.connect(url, {
    reconnect: {
      max: 1800000,
      min: 2000,
      retries: Infinity
    },
    manual: true
  });

  connection.on('open', () => logger.log('MS connection opened'));
  connection.on('close', () => console.log('MS connection closed'));
  connection.on('end', () => console.log('MS disconnected'));
  connection.on('error', (error) => logger.error('MS connection error', error));
  connection.on('data', (data) => console.log(`MS received data: ${JSON.stringify(data)}`));

  connection.open();
}

function init() {
  chrome.storage.local.get((items) => {
    connect(items.displayId, items.machineId);
  });
}

module.exports = {
  init
}

/* eslint-disable max-statements */
const Primus = require('./primus');
const logger = require('../logging/logger');
const systemInfo = require('../logging/system-info');

const messageHandlers = {};

let connection = null;
let readyState = null;

function connect(displayId, machineId, isStaging) {
  const environment = isStaging ? "-stage" : "";
  const url = `https://services${environment}.risevision.com/messaging/primus/?displayId=${displayId}&machineId=${machineId}`;
  connection = Primus.connect(url, {
    reconnect: {
      max: 1800000,
      min: 2000,
      retries: Infinity
    },
    manual: true
  });

  connection.on('readyStateChange', newState => readyState = newState);
  connection.on('open', () => logger.log('messaging - MS connection opened'));
  connection.on('close', () => logger.log('messaging - MS connection closed'));
  connection.on('end', () => logger.log('messaging - MS disconnected'));
  connection.on('error', (error) => logger.error('messaging - MS connection error', error));
  connection.on('reconnect', () => logger.log('messaging - MS reconnection attempt started'));
  connection.on('reconnected', () => logger.log('messaging - MS successfully reconnected'));
  connection.on('data', (data) => {
    logger.log('MS received data', data);

    const key = data.topic || data.msg || data;
    if (typeof key === 'string') {
      const handlers = messageHandlers[key.toLowerCase()];
      if (handlers && handlers.length > 0) {
        handlers.forEach(handler => handler(data));
      }
    }
  });

  connection.open();

  return new Promise((resolve, reject) => {
    connection.on('open', resolve);
    connection.on('error', reject);
  });
}

function readSettings() {
  return Promise.all([systemInfo.getDisplayId(), systemInfo.getMachineId(), systemInfo.isStageEnvironment()])
}

function init() {
  return readSettings().then((values) => {
    const [displayId, machineId, isStaging] = values;
    return connect(displayId, machineId, isStaging);
  });
}

function on(topic, handler) {
  const key = topic.toLowerCase();
  if (!messageHandlers[key]) {
    messageHandlers[key] = [];
  }

  messageHandlers[key].push(handler);
}

function send(message) {
  if (!connection) {
    logger.error('messaging - cannot send message to MS, no connection');
    return;
  }

  connection.write(message);
}

function isConnected() {
  return readyState === "open";
}

module.exports = {
  init,
  on,
  send,
  isConnected
}

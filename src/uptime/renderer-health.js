const viewerMessaging = require('../messaging/viewer-messaging');

const pingTimeout = 3000;

const MAX_NUMBER_OF_FAILURES = 3;
let failures = 0;
let multipleFailuresListener = () => {}; // eslint-disable-line func-style

function check() {
  return new Promise(resolve => {
    const pongTimeoutTimer = setTimeout(() => {
      viewerMessaging.removeAllListeners("renderer-pong");
      resolve(false);
      failures += 1;
      if (failures >= MAX_NUMBER_OF_FAILURES) {
        multipleFailuresListener();
        failures = 0;
      }
    }, pingTimeout);

    viewerMessaging.once("renderer-pong", () => {
      clearTimeout(pongTimeoutTimer);
      resolve(true);
      failures = 0;
    });

    viewerMessaging.send({from: 'player', topic: 'renderer-ping'});
  });
}

function onMultipleFailures(listener) {
  multipleFailuresListener = listener;
}

module.exports = {
  check,
  onMultipleFailures
};

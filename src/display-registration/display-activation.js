const messaging = require('../messaging/messaging-service-client');


function init() {
  messaging.init().then(() => console.log('MS init'));
}

module.exports = {
  init
}

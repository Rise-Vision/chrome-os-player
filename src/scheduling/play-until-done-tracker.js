const viewerMessaging = require('../messaging/viewer-messaging');
const logger = require('../logging/logger');

let templateDoneReceived = false;

viewerMessaging.on('template-done', () => {
  logger.log('template-done received');
  templateDoneReceived = true;
});

module.exports = {
  isDone() {
    return templateDoneReceived;
  },
  reset() {
    templateDoneReceived = false;
  }
};

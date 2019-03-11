const messagingServiceClient = require('../messaging/messaging-service-client');
const logger = require('../logging/logger');
const scheduleParser = require('../scheduling/schedule-parser');
const rendererHealth = require('./renderer-health');
const networkInvestigation = require('./network-investigation');

const uptimeInterval = 300000;
let schedule = null;

function setSchedule(data) {
  if (data && data.content && data.content.schedule) {
    schedule = data.content.schedule;
  }
}

function init() {
  setInterval(calculate, uptimeInterval);
}

function calculate() {
  if (!schedule) {
    logger.error('uptime - schedule not set');
    return;
  }

  rendererHealth.check().then(rendererResult => {
    const connectedToMS = messagingServiceClient.isConnected();
    const shouldBePlaying = scheduleParser.scheduledToPlay(schedule);
    logger.logUptime(connectedToMS, rendererResult, shouldBePlaying);
    if (!connectedToMS) {networkInvestigation.reportConnectivity();}
  })
  .catch(err => logger.error('uptime - error', err));
}

module.exports = {
  setSchedule,
  init
};

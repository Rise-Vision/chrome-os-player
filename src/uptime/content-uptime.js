const viewerMessaging = require('../messaging/viewer-messaging');
const logger = require('../logging/logger');
const uptime = require('./uptime');

const uptimeInterval = 60000;

function handleUptimeResponse(response) {
  logger.log('uptime - result', JSON.stringify(response));
}

function init() {
  viewerMessaging.on('content-uptime-result', handleUptimeResponse);

  setInterval(retrieveUptime, uptimeInterval);
}

function retrieveUptime() {
  if (uptime.isActive()) {
    const schedule = {}
    const msMessage = {topic: "content-uptime", schedule};
    viewerMessaging.send(msMessage);
  }
}

module.exports = {
  init
};

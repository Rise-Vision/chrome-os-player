const viewerMessaging = require('../messaging/viewer-messaging');
const logger = require('../logging/logger');
const uptime = require('./uptime');

const uptimeInterval = 60000;
const responseTimeout = 3000;
let responseTimeoutId;

function handleUptimeResponse(response) {
  logger.log('uptime - result', JSON.stringify(response));

  clearTimeout(responseTimeoutId);

  logger.logTemplateUptime(response.presentationId, response.templateProductCode, response.templateVersion, true, response.errorValue);
}

function handleNoResponse() {
  logger.log('uptime - no response');

  const response = {};
  
  logger.logTemplateUptime(response.presentationId, response.templateProductCode, response.templateVersion, false, null);
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
    responseTimeoutId = setTimeout(handleNoResponse, responseTimeout);
  }
}

module.exports = {
  init
};

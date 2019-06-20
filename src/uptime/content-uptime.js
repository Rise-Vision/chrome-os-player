const viewerMessaging = require('../messaging/viewer-messaging');
const logger = require('../logging/logger');
const uptime = require('./uptime');

const uptimeInterval = 10000;
const responseTimeout = 3000;
let responseTimeoutId = null;
let expectedTemplate = null;

function handleUptimeResponse(response) {
  logger.log('uptime - result', JSON.stringify(response));
  clearTimeout(responseTimeoutId);
  logger.logTemplateUptime(response.presentationId, response.templateProductCode, response.templateVersion, true, response.errorValue);
}

function handleNoResponse() {
  logger.log('uptime - no response');
  if (expectedTemplate) {
    logger.logTemplateUptime(expectedTemplate.presentationId, expectedTemplate.productCode, expectedTemplate.version, false, null);
  }
}

function init() {
  viewerMessaging.on('content-uptime-result', handleUptimeResponse);
  viewerMessaging.on('playing-item', handlePlayingItemFromViewer);

  setInterval(retrieveUptime, uptimeInterval);
}

function retrieveUptime() {
  if (expectedTemplate && expectedTemplate.presentationType === 'HTML Template' && uptime.isActive()) {
    viewerMessaging.send({topic: 'content-uptime', forPresentationId: expectedTemplate.presentationId});
    responseTimeoutId = setTimeout(handleNoResponse, responseTimeout);
  }
}

function handlePlayingItemFromViewer(response) {
  console.log('playing item received from Viewer', response);
  handlePlayingItem(response.item);
}

function handlePlayingItem(item) {
  console.log('playing item received', item);
  expectedTemplate = item;
}

module.exports = {
  init,
  handlePlayingItem
};

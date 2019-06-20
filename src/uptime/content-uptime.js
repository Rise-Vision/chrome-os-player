const viewerMessaging = require('../messaging/viewer-messaging');
const logger = require('../logging/logger');
const uptime = require('./uptime');

const uptimeInterval = 10000;
const responseTimeout = 3000;
let responseTimeoutId = null;
let expectedTemplate = null;

function handleUptimeResponse(response) {
  logger.log('uptime - result', JSON.stringify(response));
  if (!response || !response.template || !response.components) {
    logger.log('uptime - invalid result', JSON.stringify(response));
    return;
  }

  clearTimeout(responseTimeoutId);

  const result = response.template;
  result.responding = true;
  logger.logTemplateUptime(result);

  response.components.forEach(entry=>logger.logComponentUptime(entry));
}

function handleNoResponse() {
  logger.log('uptime - no response');
  if (expectedTemplate) {
    logger.logTemplateUptime({
      presentation_id: expectedTemplate.presentationId,
      template_product_code: expectedTemplate.templateProductCode,
      template_version: expectedTemplate.templateVersion,
      responding: false
    });
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

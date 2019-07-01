const viewerMessaging = require('../messaging/viewer-messaging');
const logger = require('../logging/logger');
const uptime = require('./uptime');

const uptimeInterval = 5 * 60000; // eslint-disable-line no-magic-numbers
const responseTimeout = 6000;
let responseTimeoutId = null;
let playingItem = null;
let expectedTemplate = null;

function handleUptimeResponse(response) {
  logger.log('uptime - result', JSON.stringify(response));

  if (!expectedTemplate || !isValidResponse(response)) {
    logger.log('uptime - invalid result', JSON.stringify(response));
    return;
  }

  clearTimeout(responseTimeoutId);
  expectedTemplate = null;

  const result = response.template;
  result.responding = true;
  logger.logTemplateUptime(result);

  response.components.forEach(entry=>logger.logComponentUptime(entry));
}

function isValidResponse(response) {
  return response && response.template && response.components &&
    response.template.presentation_id === expectedTemplate.presentationId;
}

function handleNoResponse() {
  logger.log('uptime - no response', expectedTemplate);
  if (expectedTemplate) {
    logger.logTemplateUptime({
      presentation_id: expectedTemplate.presentationId,
      template_product_code: expectedTemplate.productCode,
      template_version: expectedTemplate.version,
      responding: false
    });
    expectedTemplate = null;
  }
}

function init() {
  viewerMessaging.on('content-uptime-result', handleUptimeResponse);
  viewerMessaging.on('playing-item', handlePlayingItemFromViewer);

  setInterval(retrieveUptime, uptimeInterval);
}

function retrieveUptime() {
  if (playingItem && playingItem.presentationType === 'HTML Template' && uptime.isActive()) {
    viewerMessaging.send({topic: 'content-uptime', forPresentationId: playingItem.presentationId});
    expectedTemplate = playingItem;
    responseTimeoutId = setTimeout(handleNoResponse, responseTimeout);
  }
}

function handlePlayingItemFromViewer(response) {
  handlePlayingItem(response.item);
}

function handlePlayingItem(item) {
  playingItem = item;
}

module.exports = {
  init,
  handlePlayingItem
};

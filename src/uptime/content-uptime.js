const viewerMessaging = require('../messaging/viewer-messaging');
const logger = require('../logging/logger');
const uptime = require('./uptime');
const schedulePlayer = require('../scheduling/schedule-player');

const uptimeInterval = 10000;
const responseTimeout = 3000;
let responseTimeoutId = null;
let expectedTemplate = {};
let _isViewerBased = false;

function handleUptimeResponse(response) {
  logger.log('uptime - result', JSON.stringify(response));
  clearTimeout(responseTimeoutId);
  logger.logTemplateUptime(response.presentationId, response.templateProductCode, response.templateVersion, true, response.errorValue);
}

function handleNoResponse() {
  logger.log('uptime - no response');
  logger.logTemplateUptime(expectedTemplate.presentationId, expectedTemplate.productCode, expectedTemplate.version, false, null);
}

function init() {
  viewerMessaging.on('content-uptime-result', handleUptimeResponse);

  setInterval(retrieveUptime, uptimeInterval);
}

function retrieveUptime() {
  if (_isViewerBased) {
    // TO DO Get expected presentation from Viewer
    return;
  }
  const playingItem = schedulePlayer.getPlayingItem();
  if (!playingItem || !playingItem.presentationType === 'HTML Template') {return;}
  expectedTemplate = {
    presentationId: playingItem.presentationId,
    productCode: playingItem.productCode,
    version: playingItem.version
  };

  if (expectedTemplate && uptime.isActive()) {
    const msMessage = {topic: "content-uptime"};
    viewerMessaging.send(msMessage);
    responseTimeoutId = setTimeout(handleNoResponse, responseTimeout);
  }
}

function setViewerBased(value) {
  _isViewerBased = value;
}

module.exports = {
  init,
  setViewerBased
};

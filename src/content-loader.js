const gcsClient = require('./gcs-client');
const updateFrequencyLogger = require('./update-frequency-logger');
const logger = require('./logging/logger');
const htmlTemplateURLParser = require('./html-template-url-parser');
const systemInfo = require('./logging/system-info');

function fetchContent() {
  return systemInfo.getDisplayId().then(displayId => {
    const bucketName = 'risevision-display-notifications';
    const filePath = `${displayId}/content.json`;
    return gcsClient.fetchJson(bucketName, filePath);
  })
  .then(contentData => {
    if (!contentData || Object.keys(contentData).length === 0) {
      logger.error('player - empty content data');
      return null;
    }
    return contentData;
  })
  .then(contentData => {
    updateFrequencyLogger.logContentChanges(contentData);

    chrome.storage.local.set({content: contentData});
    return contentData;
  });
}

function loadData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(items => resolve(items.content));
  })
  .then(savedContent => savedContent || fetchContent())
  .then(data => {
    chrome.storage.local.remove('content');
    return data;
  });
}

function loadContent() {
  return Promise.all([loadData(), systemInfo.isStageEnvironment()]).then(([contentData, isStaging]) => { // eslint-disable-line max-statements
    const supportedWidgets = ['image', 'video', 'google-calendar', 'google-spreadsheet', 'html', 'rss', 'text', 'time-date', 'web-page'];
    const regex = new RegExp(`http(?:s?)://s3.amazonaws.com/widget-(${supportedWidgets.join('|')})`, 'g');
    const rewriteUrl = (match, widgetName) => `http://widgets.risevision.com/widget-${widgetName}`; // eslint-disable-line func-style
    const hasPresentations = contentData && contentData.content && contentData.content.presentations;
    const hasScheduleItems = contentData && contentData.content && contentData.content.schedule && contentData.content.schedule.items;

    if (hasPresentations) {
      contentData.content.presentations.forEach(presentation => {
        if (presentation.layout) {
          presentation.layout = presentation.layout.replace(regex, rewriteUrl);
        }
      });
    }

    return hasScheduleItems && hasPresentations ?
      htmlTemplateURLParser.restructureHTMLTemplatesToURLItems(contentData, isStaging) :
      contentData;
  });
}

module.exports = {
  fetchContent,
  loadContent
}

const gcsClient = require('./gcs-client');
const updateFrequencyLogger = require('./update-frequency-logger');
const logger = require('./logging/logger');
const systemInfo = require('./logging/system-info');

function readDisplayId() {
  return new Promise((resolve) => chrome.storage.local.get(items => resolve(items.displayId)));
}

function fetchContent() {
  return readDisplayId().then(displayId => {
    const bucketName = 'risevision-display-notifications';
    const filePath = `${displayId}/content.json`;
    return gcsClient.fetchJson(bucketName, filePath);
  })
  .then((contentData) => {
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
  return loadData().then((contentData) => { // eslint-disable-line max-statements
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

    if (hasScheduleItems && hasPresentations) {
      const HTMLTemplateURL = "http://widgets.risevision.com/STAGE/templates/PCODE/src/template.html?presentationId=PID";
      const isBeta = systemInfo.isBeta();

      contentData.content.schedule.items
      .filter(item=>item.presentationType === "HTML Template")
      .forEach(item=>{
        item.type = "url";
        item.objectReference = HTMLTemplateURL
          .replace("STAGE", isBeta ? "beta" : "stable")
          .replace("PCODE", getPCode(item.objectReference, contentData))
          .replace("PID", item.objectReference);
      });
    }

    return contentData;
  });

  function getPCode(objectReference, contentData) {
    const referencedPresentation = contentData.content.presentations
      .filter(pres=>pres.id === objectReference);

    return referencedPresentation[0] && referencedPresentation[0].productCode;
  }
}

module.exports = {
  fetchContent,
  loadContent
}

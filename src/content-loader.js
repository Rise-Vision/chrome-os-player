const gcsClient = require('./gcs-client');
const logger = require('./logging/logger');

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
    if (!contentData || Object.entries(contentData).length === 0) {
      logger.error('empty content data');
      return null;
    }
    return contentData;
  })
  .then(contentData => {
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
  return loadData().then((contentData) => {
    const supportedWidgets = ['image', 'video', 'google-calendar', 'google-spreadsheet', 'html', 'rss', 'text', 'time-date', 'web-page'];
    const regex = new RegExp(`http(?:s?)://s3.amazonaws.com/widget-(${supportedWidgets.join('|')})`, 'g');
    const rewriteUrl = (match, widgetName) => `http://widgets.risevision.com/widget-${widgetName}`; // eslint-disable-line func-style
    const hasPresentations = contentData && contentData.content && contentData.content.presentations;

    if (hasPresentations) {
      contentData.content.presentations.forEach((presentation) => presentation.layout = presentation.layout.replace(regex, rewriteUrl));
    }

    return contentData;
  });
}

module.exports = {
  fetchContent,
  loadContent
}

const gcsClient = require('./gcs-client');

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
    const regex = new RegExp('http(?:s?)://s3.amazonaws.com/widget-(image|video)', 'g');
    const rewriteUrl = (match, widgetName) => `http://widgets.risevision.com/widget-${widgetName}`; // eslint-disable-line func-style
    const hasPresentations = contentData && contentData.content && contentData.content.presentations;

    if (hasPresentations) {
      contentData.content.presentations.forEach((presentation) => presentation.layout = presentation.layout.replace(regex, rewriteUrl));
    }

    return contentData;
  });
}

module.exports = {
  fetchContent
}

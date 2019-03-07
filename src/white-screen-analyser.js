const logger = require('./logging/logger');

let contentData = null;

module.exports = {
  setContent(data) {
    contentData = data;
  },
  checkExternalContent
};

function checkExternalContent() {
  if (!contentData) {
    return;
  }

  const riseVisionURLs = /(http(s)?:\/\/)?storage\.googleapis\.com\/risemedialibrary.+|(http(s)?:\/\/)?widgets\.risevision\.com\/.+/;
  const scheduleItems = contentData.content.schedule.items;
  const externalURLs = scheduleItems.filter(item => item.type === "url" && !riseVisionURLs.test(item.objectReference)).map(item => item.objectReference);
  externalURLs.forEach(url => checkURL(url));
}

function checkURL(url) {
  fetch(url).then(response => {
    logger.log("white screen external URL check error", {url, statusCode: response.status});
  })
  .catch(error => {
    logger.log("white screen external URL check error", {url, error: error.message});
  });
}

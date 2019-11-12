const db = require('./database/api');
const queueCheckInterval = 5000;
const fileDownloader = require('./file-downloader');
const localMessaging = require('./messaging/local-messaging-helper');
const logger = require('../logging/logger');

function checkStaleFiles(timer = setTimeout) {
  const staleEntries = db.fileMetadata.getStale();
  if (!staleEntries.length) {
    return intervalCheck();
  }
  const entry = staleEntries[0];
  return processEntry(entry)
    .then(() => checkStaleFiles(timer))
    .catch((err) => {
      handleError(err, entry)
      .catch(() => {});
      return intervalCheck();
    });

  function intervalCheck() {
    return Promise.resolve(timer(checkStaleFiles.bind(null, timer), queueCheckInterval));
  }
}

function processEntry(entry) {
  const {filePath, version} = entry;
  return fileDownloader.download(entry)
    .then(() => updateMetadata(version, filePath))
    .then((metadata) => localMessaging.sendFileUpdate(metadata));
}

function updateMetadata(downloadedVersion, filePath) {
  const metadata = db.fileMetadata.get(filePath);
  const currentVersion = metadata && metadata.version;
  const newStatus = currentVersion === downloadedVersion ? 'CURRENT' : 'STALE';
  return db.fileMetadata.put({filePath, status: newStatus, version: downloadedVersion || currentVersion});
}

function handleError(err, entry) {
  const {filePath, version} = entry;
  const defaultMessage = `storage - error downloading entry filePath: ${filePath} version: ${version}`;
  const msg = err ? err.message : defaultMessage;
  localMessaging.sendFileError({filePath, version, msg, details: err ? err.stack : {}});
  logger.error(defaultMessage, err, {filePath});

  return db.fileMetadata.put({filePath, status: "UNKNOWN", version: "0"})
    .then(() => Promise.reject(err))
    .catch(() => Promise.reject(err));
}

module.exports = {
  checkStaleFiles
}

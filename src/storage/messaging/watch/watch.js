const gcsValidator = require('gcs-filepath-validator');
const localMessaging = require('../local-messaging-helper');
const messagingServiceClient = require('../../../messaging/messaging-service-client');
const db = require("../../database/api");
const update = require("../update/update");
const logger = require('../../../logging/logger');
const fileSystem = require('../../file-system');

function sendFileUpdate(entry) {
  const {filePath, status, version} = entry;
  if (entry.status === 'CURRENT') {
    return fileSystem.readCachedFile(filePath, version)
      .then(() => localMessaging.sendFileUpdate({filePath, status, version}))
      .catch(error => {
        const msg = `cannot read file ${filePath} before sending file update message`;
        logger.error(`storage - ${msg}`, error);
        const metadata = {filePath, version: '0', status: 'UNKNOWN'};
        return update.updateWatchlistAndMetadata(metadata)
          .then(() => localMessaging.sendFileError({filePath, version, msg, details: error ? error.stack : {}}))
          .then(() => requestMSUpdate({filePath, topic: 'watch'}, metadata));
      });
  }

  return localMessaging.sendFileUpdate({filePath, status, version});
}

function handleFileWatchResult(message) {
  const {filePath, version, token} = message;

  logger.log(`storage - received version ${version} for ${filePath}`);

  const status = token ? 'STALE' : 'CURRENT';

  return update.updateWatchlistAndMetadata({filePath, version, status, token})
  .then(() => sendFileUpdate({filePath, status, version}))
  .catch(error => logger.error(`storage - error on handling file watch result`, error, {filePath}));
}

function handleFolderWatchResult(message) {
  logger.log(`storage - handling folder watch result ${JSON.stringify(message)}`);

  const {folderData} = message;

  return Promise.all(folderData.map(fileData => handleFileWatchResult(fileData)));
}

function processFileWatch(message, existingMetadata) {
  const metadata = existingMetadata || {filePath: message.filePath};
  metadata.status = metadata.status || "UNKNOWN";

  logger.log(`storage - processing watch for file ${JSON.stringify(metadata)}`);

  if (metadata.status === "UNKNOWN") {
    return requestMSUpdate(message, metadata);
  }

  return Promise.resolve(sendFileUpdate({
    filePath: message.filePath,
    status: metadata.status,
    version: metadata.version
  }));
}

function processFolderWatch(message, existingMetadata) {
  const folderPath = message.filePath;
  if (existingMetadata) {
    const folderFiles = db.fileMetadata.getFolderFiles(folderPath);
    logger.log(`storage - processing watch for existing folder ${folderPath}, ${JSON.stringify(folderFiles)}`);
    const promises = folderFiles.map(fileMetadata => processFileWatch({filePath: fileMetadata.filePath, topic: 'watch'}, fileMetadata));
    return Promise.all(promises);
  }

  return requestMSUpdate(message, {filePath: folderPath, version: "0"});
}

function requestMSUpdate(message, metaData) {
  const msMessage = Object.assign({}, message, {version: metaData.version || "0"});

  logger.log('storage - requesting MS update', msMessage);

  return db.fileMetadata.put(metaData)
  .then(()=>{
    messagingServiceClient.send(msMessage)
  });
}

function processFileOrFolderWatch(message) {
  const {filePath} = message;

  const existingMetadata = db.fileMetadata.get(filePath);
  const isFolder = filePath.endsWith("/");
  const action = isFolder ? processFolderWatch : processFileWatch;

  return action(message, existingMetadata);
}

module.exports = {
  process(message) {
    const filePath = message.filePath;
    logger.log(`storage - received watch for ${filePath}`);

    if (!gcsValidator.validateFilepath(filePath)) {
      return Promise.reject(new Error('Invalid watch message'));
    }

    return processFileOrFolderWatch(message)
      .then(() => db.fileMetadata.updateWatchSequence(filePath));
  },
  msResult(message) {
    const {filePath, error, folderData, watchlistLastChanged} = message;

    if (error) {
      return localMessaging.sendFileUpdate({filePath, status: "NOEXIST"});
    }

    const action = folderData ? handleFolderWatchResult : handleFileWatchResult;

    return action(message)
      .then(() => db.watchlist.setLastChanged(watchlistLastChanged));
  },
  requestMSUpdate
};

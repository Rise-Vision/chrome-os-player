const messagingServiceClient = require('../../../messaging/messaging-service-client');
const logger = require('../../../logging/logger');
const db = require("../../database/api");
const deleteFile = require("../delete/delete");
const update = require("../update/update");
const watch = require("./watch");

function requestWatchlistCompare() {
  const lastChanged = db.watchlist.lastChanged();
  const msMessage = {topic: "WATCHLIST-COMPARE", lastChanged};

  logger.log(`storage - sending WATCHLIST-COMPARE`, {lastChanged});
  messagingServiceClient.send(msMessage);
}

function addNewFile(filePath) {
  const metaData = {filePath, version: '0', status: "UNKNOWN"};

  return update.updateWatchlistAndMetadata(metaData)
    .then(() => refreshUpdatedFile(metaData));
}

function withUnknownStatus(metaData) {
  return Object.assign({}, metaData, {status: "UNKNOWN"});
}

function refreshUpdatedFile(metaData) {
  const message = {topic: "WATCH", filePath: metaData.filePath};
  const updatedMetaData = withUnknownStatus(metaData);

  return watch.requestMSUpdate(message, updatedMetaData);
}

function markMissingFilesAsUnknown(remoteWatchlist) {
  const localWatchlist = db.watchlist.allEntries();

  return Promise.all(localWatchlist
    .filter(entry => !remoteWatchlist[entry.filePath])
    .map(entry => db.fileMetadata.get(entry.filePath))
    .filter(entry => entry && entry.filePath)
    .map(metaData => {
      const updatedMetaData = withUnknownStatus(metaData);

      return db.fileMetadata.put(updatedMetaData);
  }));
}

function rewatchMissingFolders(remoteWatchlist) {
  db.fileMetadata.getAllFolders()
  .filter(entry=>!remoteWatchlist[entry.filePath])
  .forEach(entry=>{
    console.log(entry);
    watch.requestMSUpdate({
      topic: "watch",
      filePath: entry.filePath
    }, entry);
  });
}

function refresh(watchlist, lastChanged) {
  const filePaths = Object.keys(watchlist);
  logger.log(`storage - received WATCHLIST-RESULT`, {lastChanged, filePaths});

  if (filePaths.length === 0 && lastChanged !== "0") {
    return Promise.resolve();
  }

  return Promise.all(filePaths.map(filePath => {
    const version = watchlist[filePath];
    const metaData = db.fileMetadata.get(filePath);

    if (!metaData) {
      if (version === "0") {
        return Promise.resolve();
      }

      return addNewFile(filePath);
    }

    return version === metaData.version ? Promise.resolve() :
      version === "0" ? deleteFile.process(metaData) :
      refreshUpdatedFile(metaData);
  }))
  .then(() => markMissingFilesAsUnknown(watchlist))
  .then(() => db.watchlist.setLastChanged(lastChanged))
  .then(() => rewatchMissingFolders(watchlist));
}

module.exports = {
  refresh,
  requestWatchlistCompare
};

const db = require("../storage/database/api");
const logger = require("../logging/logger");
const messagingServiceClient = require('./messaging-service-client');
const rebootScheduler = require('../reboot-scheduler');

module.exports = {
  init() {
    messagingServiceClient.on('clear-local-storage-request', ()=>{

      logger.log('storage - clear-local-storage-request');

      db.fileMetadata.clear();
      db.watchlist.clear();

      logger.log('storage - database cleared. Restarting...', db.getEntireDBObject());

      rebootScheduler.restart();
    })
  }
}

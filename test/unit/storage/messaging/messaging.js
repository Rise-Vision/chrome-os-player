const assert = require('assert');
const sinon = require('sinon');

const messagingServiceClient = require('../../../../src/messaging/messaging-service-client');
const localMessaging = require('../../../../src/storage/messaging/local-messaging-helper');
const db = require('../../../../src/storage/database/api');
const logger = require('../../../../src/logging/logger');

const messaging = require('../../../../src/storage/messaging/messaging');

const sandbox = sinon.createSandbox();

describe('Storage Messaging', () => {

  afterEach(() => sandbox.restore());

  beforeEach(() => {
    sandbox.stub(db.fileMetadata, 'put').resolves();
    sandbox.stub(db.watchlist, 'put');
    sandbox.stub(db.fileMetadata, 'delete').resolves();
    sandbox.stub(db.watchlist, 'delete');
    sandbox.stub(db.watchlist, 'setLastChanged');
    sandbox.stub(logger, 'log');
    sandbox.stub(logger, 'error');
  });

  const filePath = 'local-storage-test/test-1x1.png';
  const version = '1516908679637510';
  const token = {
    hash: 'abc123',
    data: {
      displayId: 'test-display-id',
      timestamp: Date.now(),
      filePath: 'test-path'
    }
  };

  it('should listen to MSFILEUPDATE message', () => {
    sandbox.stub(messagingServiceClient, 'on');

    messaging.init();

    sinon.assert.calledWith(messagingServiceClient.on, 'MSFILEUPDATE');
  });

  it('should reject on invalid MSFILEUPDATE message', () => {
    const message = {filePath, version, token, topic: 'MSFILEUPDATE'};

    return messaging.handleMSFileUpdate(message)
      .then(assert.fail)
      .catch((error) => {
        assert.ok(error);
      });
  });

  it('should add entry to metadata and watchlist db collections on MSFILEUPDATE update message', () => {
    const message = {filePath, version, token, type: 'UPDATE', topic: 'MSFILEUPDATE'};

    return messaging.handleMSFileUpdate(message).then(() => {
      sinon.assert.calledWith(db.watchlist.put, {filePath, version, token, status: 'STALE'});
      sinon.assert.calledWith(db.fileMetadata.put, {filePath, version, token, status: 'STALE'});
    });
  });

  it('should add entry to metadata and watchlist db collections on MSFILEUPDATE add message', () => {
    const message = {filePath, version, token, type: 'ADD', topic: 'MSFILEUPDATE'};

    return messaging.handleMSFileUpdate(message).then(() => {
      sinon.assert.calledWith(db.watchlist.put, {filePath, version, token, status: 'STALE'});
      sinon.assert.calledWith(db.fileMetadata.put, {filePath, version, token, status: 'STALE'});
    });
  });

  it('should delete entry from metadata collection and send file update on MSFILEUPDATE delete message', () => {
    sandbox.stub(localMessaging, 'sendFileUpdate').resolves();

    const message = {filePath, version, token, type: 'DELETE', topic: 'MSFILEUPDATE', watchlistLastChanged: '2522697262234'};

    return messaging.handleMSFileUpdate(message).then(() => {
      sinon.assert.calledWith(db.fileMetadata.delete, filePath);
      sinon.assert.calledWith(localMessaging.sendFileUpdate, {filePath, status: 'DELETED'});
    });
  });

  it('should listen to WATCH message', () => {
    sandbox.stub(localMessaging, 'on');

    messaging.init();

    sinon.assert.calledWith(localMessaging.on, 'WATCH');
  });

  it('should reject invalid watch message', () => {
    const filePath = 'invalid'; // eslint-disable-line no-shadow
    return messaging.handleWatch({filePath})
      .then(assert.fail)
      .catch((error) => {
        assert.ok(error);
      });
  });

  it('should save metadata and request file update to messaging service on new watch message', () => {
    sandbox.stub(messagingServiceClient, 'send');
    sandbox.stub(db.fileMetadata, 'get').returns();
    sandbox.stub(localMessaging, 'sendFileUpdate').resolves();

    const expectedMessage = {filePath, version: '0'};

    return messaging.handleWatch({filePath}).then(() => {
      sinon.assert.calledWith(messagingServiceClient.send, expectedMessage);
      sinon.assert.notCalled(localMessaging.sendFileUpdate);
    });
  });

  it('should send file update message to viewer on watch message for existing file', () => {
    sandbox.stub(messagingServiceClient, 'send');
    sandbox.stub(localMessaging, 'sendFileUpdate').resolves();

    const metadata = {filePath, version, status: 'STALE'};
    sandbox.stub(db.fileMetadata, 'get').returns(metadata)

    return messaging.handleWatch({filePath}).then(() => {
      sinon.assert.calledWith(localMessaging.sendFileUpdate, metadata);
      sinon.assert.notCalled(messagingServiceClient.send);
    });
  });

  it('should listen to WATCH-RESULT message', () => {
    sandbox.stub(messagingServiceClient, 'on');

    messaging.init();

    sinon.assert.calledWith(messagingServiceClient.on, 'WATCH-RESULT');
  });

  it('should send file update message to viewer on WATCH-RESULT message', () => {
    const message = {msg: 'ok', topic: 'watch-result', filePath, version, token, watchlistLastChanged: '1522699819330'};

    sandbox.stub(localMessaging, 'sendFileUpdate').resolves();
    sandbox.stub(db.fileMetadata, 'isVersionMismatch').returns(true);

    return messaging.handleWatchResult(message).then(() => {
      sinon.assert.calledWith(db.watchlist.put, {filePath, version, token, status: 'STALE'});
      sinon.assert.calledWith(db.fileMetadata.put, {filePath, version, token, status: 'STALE'});

      sinon.assert.calledWith(localMessaging.sendFileUpdate, {filePath, version, status: 'STALE'});
    });
  });

});

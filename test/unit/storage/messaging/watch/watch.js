const sinon = require('sinon');

const logger = require('../../../../../src/logging/logger');
const messagingServiceClient = require('../../../../../src/messaging/messaging-service-client');
const db = require('../../../../../src/storage/database/api');
const localMessaging = require('../../../../../src/storage/messaging/local-messaging-helper');
const fileSystem = require('../../../../../src/storage/file-system');

const watch = require('../../../../../src/storage/messaging/watch/watch');

const sandbox = sinon.createSandbox();

describe("Storage Watch", () => {

  beforeEach(() => {
    sandbox.stub(db.fileMetadata, 'updateWatchSequence').resolves();
    sandbox.stub(db.fileMetadata, 'put').resolves();
    sandbox.stub(db.watchlist, 'put').resolves();
    sandbox.stub(db.watchlist, 'setLastChanged').resolves();
    sandbox.stub(messagingServiceClient, 'send').resolves();
    sandbox.stub(logger, 'log');
    sandbox.stub(logger, 'error');
    sandbox.stub(localMessaging, 'sendFileUpdate').resolves();
    sandbox.stub(localMessaging, 'sendFileError').resolves();
  });

  afterEach(() => sandbox.restore());

  describe("WATCH", () => {

    const message = {
      topic: "watch",
      filePath: "risemedialibrary-7d948ac7-decc-4ed3-aa9c-9ba43bda91dc/new_photos/screenshot.jpg"
    };

    const folderMessage = {
      topic: "watch",
      filePath: "risemedialibrary-7d948ac7-decc-4ed3-aa9c-9ba43bda91dc/new_photos/"
    };

    it("should not request MS updates when local file is STALE", () => {
      sandbox.stub(db.fileMetadata, 'get').returns({filePath: message.filePath, status: 'STALE', version: '1'});

      return watch.process(message).then(() => {
        sinon.assert.notCalled(messagingServiceClient.send);
      });
    });

    it("should not request MS updates when local file is CURRENT", () => {
      sandbox.stub(fileSystem, 'readCachedFile').resolves();
      sandbox.stub(db.fileMetadata, 'get').returns({filePath: message.filePath, status: 'CURRENT', version: '1'});

      return watch.process(message).then(() => {
        sinon.assert.notCalled(messagingServiceClient.send);
      });
    });

    it("should broadcast FILE-ERROR when state is CURRENT but file is not readable", () => {
      sandbox.stub(fileSystem, 'readCachedFile').rejects();
      sandbox.stub(db.fileMetadata, 'get').returns({filePath: message.filePath, status: 'CURRENT', version: '1'});

      return watch.process(message).then(() => {
        sinon.assert.called(localMessaging.sendFileError);
      });
    });

    it("should mark as UNKNOWN when state is CURRENT but file is not readable", () => {
      sandbox.stub(fileSystem, 'readCachedFile').rejects();
      sandbox.stub(db.fileMetadata, 'get').returns({filePath: message.filePath, status: 'CURRENT', version: '1'});

      return watch.process(message).then(() => {
        sinon.assert.calledWith(db.fileMetadata.put, {filePath: message.filePath, status: 'UNKNOWN', version: '0'});
        sinon.assert.calledWith(db.watchlist.put, {filePath: message.filePath, status: 'UNKNOWN', version: '0'});
      });
    });

    it("should request MS updates state is CURRENT but file is not readable", () => {
      sandbox.stub(fileSystem, 'readCachedFile').rejects();
      sandbox.stub(db.fileMetadata, 'get').returns({filePath: message.filePath, status: 'CURRENT', version: '1'});

      return watch.process(message).then(() => {
        sinon.assert.calledWith(messagingServiceClient.send, {filePath: message.filePath, topic: 'watch', version: '0'});
      });
    });

    it("should request MS updates when the local file is not present", () => {
      sandbox.stub(db.fileMetadata, 'get').returns(null);

      return watch.process(message).then(() => {
        sinon.assert.calledWith(messagingServiceClient.send, {filePath: message.filePath, topic: 'watch', version: '0'});
      });
    });

    it("should request MS updates when the local file is UNKONWN", () => {
      sandbox.stub(db.fileMetadata, 'get').returns({filePath: message.filePath, status: 'UNKNOWN', version: '1'});

      return watch.process(message).then(() => {
        sinon.assert.calledWith(messagingServiceClient.send, {filePath: message.filePath, topic: 'watch', version: '1'});
      });
    });

    it("should request MS updates when folder has not been watched yet", () => {
      sandbox.stub(db.fileMetadata, 'get').returns(null);

      return watch.process(folderMessage).then(() => {
        sinon.assert.calledWith(messagingServiceClient.send, {filePath: folderMessage.filePath, topic: 'watch', version: '0'});
      });
    });

    it("should not request MS updates when folder is not empty", () => {
      sandbox.stub(db.fileMetadata, 'get').returns({filePath: folderMessage.filePath, status: 'STALE', version: '1'});
      sandbox.stub(db.fileMetadata, 'getFolderFiles').returns([{filePath: "test-filep-path", status: "STALE"}]);

      return watch.process(folderMessage).then(() => {
        sinon.assert.notCalled(messagingServiceClient.send);
      });
    });

    it("should request MS updates when folder is empty", () => {
      sandbox.stub(db.fileMetadata, 'get').returns({filePath: folderMessage.filePath, status: 'CURRENT', version: '1'});
      sandbox.stub(db.fileMetadata, 'getFolderFiles').returns([]);

      return watch.process(folderMessage).then(() => {
        sinon.assert.calledOnce(messagingServiceClient.send);
      });
    });

    it("should broacast FILE-UPDATE of local folder files", () => {
      sandbox.stub(db.fileMetadata, 'get').returns({filePath: message.filePath, status: 'CURRENT', version: '1'});

      const firstFile = {filePath: `${folderMessage.filePath}first.txt`, status: 'CURRENT', version: '10'};
      const secondFile = {filePath: `${folderMessage.filePath}second.png`, status: 'CURRENT', version: '1'};

      sandbox.stub(db.fileMetadata, 'getFolderFiles').returns([firstFile, secondFile]);
      sandbox.stub(fileSystem, 'readCachedFile').resolves();

      return watch.process(folderMessage).then(() => {
        sinon.assert.calledTwice(localMessaging.sendFileUpdate);
      });
    });

    it("should request MS updates of local folder files with status UNKNOWN", () => {
      sandbox.stub(db.fileMetadata, 'get').returns({filePath: message.filePath, status: 'UNKNOWN', version: '0'});

      const firstFile = {filePath: `${folderMessage.filePath}first.txt`, status: 'UNKNOWN', version: '10'};
      const secondFile = {filePath: `${folderMessage.filePath}second.png`, status: 'UNKNOWN', version: '0'};

      sandbox.stub(db.fileMetadata, 'getFolderFiles').returns([firstFile, secondFile]);

      return watch.process(folderMessage).then(() => {
        sinon.assert.calledTwice(messagingServiceClient.send);
      });
    });
  });

  describe("WATCH-RESULT", () => {

    it("should broadcast FILE-UPDATE with NOEXIST status when error providing from MS", () => {
      const msMessage = {
        filePath: "risemedialibrary-7d948ac7-decc-4ed3-aa9c-9ba43bda91dc/new_photos/screenshot.jpg",
        error: "NOEXIST",
        errorMsg: "NOEXIST"
      };
      return watch.msResult(msMessage).then(() => {
        sinon.assert.calledWith(localMessaging.sendFileUpdate, {filePath: msMessage.filePath, status: "NOEXIST"});
      });
    });

    it("should broadcast FILE-UPDATE with CURRENT when no token provided in message", () => {
      const msMessage = {
        filePath: "risemedialibrary-7d948ac7-decc-4ed3-aa9c-9ba43bda91dc/new_photos/screenshot.jpg",
        version: "123"
      };

      sandbox.stub(fileSystem, 'readCachedFile').resolves();

      return watch.msResult(msMessage).then(() => {
        sinon.assert.calledWith(localMessaging.sendFileUpdate, {filePath: msMessage.filePath, status: "CURRENT", version: msMessage.version});
      });
    });

    it("should broadcast FILE-UPDATE with STALE when token is provided and version is mismatched", () => {
      const msMessage = {
        filePath: "risemedialibrary-7d948ac7-decc-4ed3-aa9c-9ba43bda91dc/new_photos/screenshot.jpg",
        version: "123",
        token: {}
      };

      sandbox.stub(db.fileMetadata, 'isVersionMismatch').returns(true);

      return watch.msResult(msMessage).then(() => {
        sinon.assert.calledWith(localMessaging.sendFileUpdate, {filePath: msMessage.filePath, status: "STALE", version: msMessage.version});
      });
    });

    it("should broadcast FILE-UPDATE with CURRENT when token is provided and version is matched", () => {
      const msMessage = {
        filePath: "risemedialibrary-7d948ac7-decc-4ed3-aa9c-9ba43bda91dc/new_photos/screenshot.jpg",
        version: "123",
        token: {}
      };

      sandbox.stub(db.fileMetadata, 'isVersionMismatch').returns(false);
      sandbox.stub(fileSystem, 'readCachedFile').resolves();

      return watch.msResult(msMessage).then(() => {
        sinon.assert.calledWithMatch(localMessaging.sendFileUpdate, {filePath: msMessage.filePath, status: "CURRENT", version: msMessage.version});
      });
    });

    it("should update metadata and watchlist", () => {
      const msMessage = {
        filePath: "risemedialibrary-7d948ac7-decc-4ed3-aa9c-9ba43bda91dc/new_photos/screenshot.jpg",
        version: "123"
      };

      sandbox.stub(fileSystem, 'readCachedFile').resolves();

      return watch.msResult(msMessage).then(() => {
        sinon.assert.called(db.fileMetadata.put)
        sinon.assert.called(db.watchlist.put)
        sinon.assert.called(db.watchlist.setLastChanged);
      });
    });
  });
});

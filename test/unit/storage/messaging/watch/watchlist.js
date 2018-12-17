/* eslint-disable no-magic-numbers */
const assert = require('assert');
const sinon = require('sinon');
const messagingServiceClient = require('../../../../../src/messaging/messaging-service-client');

const db = require('../../../../../src/storage/database/api');
const watch = require('../../../../../src/storage/messaging/watch/watch');
const watchlist = require('../../../../../src/storage/messaging/watch/watchlist');

const logger = require('../../../../../src/logging/logger');
const sandbox = sinon.createSandbox();

describe('Storage Watchlist', () => {

  afterEach(() => sandbox.restore());
  beforeEach(()=> sandbox.stub(logger, 'log'));

  describe('WATCHLIST-COMPARE', () => {
    beforeEach(() => sandbox.stub(messagingServiceClient, 'send'));

    it('requests WATCHLIST-COMPARE', ()=> {
      sandbox.stub(db.watchlist, 'lastChanged').returns(123456);


      watchlist.requestWatchlistCompare();

      sinon.assert.calledWith(messagingServiceClient.send, {topic: 'WATCHLIST-COMPARE', lastChanged: 123456});
    });
  })

  describe('WATCHLIST-RESULT', () => {
    beforeEach(() => {
      sandbox.stub(db.fileMetadata, 'put').resolves();
      sandbox.stub(db.watchlist, 'put').resolves();
      sandbox.stub(db.watchlist, 'setLastChanged');
      sandbox.stub(db.fileMetadata, 'getAllFolders').returns([]);
      sandbox.stub(watch, 'requestMSUpdate').resolves();
    });

    it('refreshes the watchlist when there are changes', () => {
      const testEntries = [
        {filePath: 'bucket/file1', status: 'CURRENT', version: '1'},
        {filePath: 'bucket/file2', status: 'CURRENT', version: '2'},
        {filePath: 'bucket/file3', status: 'CURRENT', version: '3'}
      ];

      sandbox.stub(db.fileMetadata, 'get').callsFake(filePath =>
        testEntries.find(entry => entry.filePath === filePath)
      );
      sandbox.stub(db.watchlist, 'allEntries').returns(testEntries);

      const remoteWatchlist = {
        'bucket/file1': '2',
        'bucket/file2': '3',
        'bucket/file3': '3'
      };

      return watchlist.refresh(remoteWatchlist, 123456)
      .then(() => {
        // two files were updated
        sinon.assert.calledTwice(watch.requestMSUpdate);
        watch.requestMSUpdate.getCalls().forEach(call =>{
          const [message, metaData] = call.args;
          assert.deepEqual(message, {
            topic: 'WATCH', filePath: metaData.filePath
          });
          assert.equal(metaData.status, 'UNKNOWN');

          switch (metaData.filePath) {
            case 'bucket/file1': return assert.equal(metaData.version, '1');
            case 'bucket/file2': return assert.equal(metaData.version, '2');
            default: assert.fail(metaData.filePath);
          }
        });

        // no file was deleted
        sinon.assert.notCalled(db.fileMetadata.put);

        sinon.assert.calledOnce(db.watchlist.setLastChanged);
        sinon.assert.calledWith(db.watchlist.setLastChanged, 123456);
      });
    });

    it('refreshes the watchlist when there are changes and deletions', () => {
      const testEntries = [
        {filePath: 'bucket/file1', status: 'CURRENT', version: '1'},
        {filePath: 'bucket/file2', status: 'CURRENT', version: '2'},
        {filePath: 'bucket/file3', status: 'CURRENT', version: '3'}
      ];

      sandbox.stub(db.fileMetadata, 'get').callsFake(filePath =>
        testEntries.find(entry => entry.filePath === filePath)
      );
      sandbox.stub(db.watchlist, 'allEntries').returns(testEntries);

      const remoteWatchlist = {
        'bucket/file1': '2',
        'bucket/file3': '3'
      };

      return watchlist.refresh(remoteWatchlist, 123456)
      .then(() => {
        // just one file was updated
        sinon.assert.calledOnce(watch.requestMSUpdate);
        assert.deepEqual(watch.requestMSUpdate.lastCall.args[0], {
          topic: 'WATCH',
          filePath: 'bucket/file1'
        });
        assert.deepEqual(watch.requestMSUpdate.lastCall.args[1], {
          filePath: 'bucket/file1',
          status: 'UNKNOWN',
          version: '1'
        });

        // one file was deleted
        sinon.assert.calledWith(db.fileMetadata.put, {filePath: 'bucket/file2', status: 'UNKNOWN', version: '2'});
        sinon.assert.calledWith(db.watchlist.setLastChanged, 123456);
      });
    });

    it('refreshes the watchlist when there are changes and additions', () => {
      const testEntries = [
        {filePath: 'bucket/file1', status: 'CURRENT', version: '1'},
        {filePath: 'bucket/file2', status: 'CURRENT', version: '2'},
        {filePath: 'bucket/file3', status: 'CURRENT', version: '3'}
      ];

      sandbox.stub(db.fileMetadata, 'get').callsFake(filePath =>
        testEntries.find(entry => entry.filePath === filePath)
      );
      sandbox.stub(db.watchlist, 'allEntries').returns(testEntries);

      const remoteWatchlist = {
        'bucket/file1': '2',
        'bucket/file2': '3',
        'bucket/file3': '3',
        'bucket/dir/file4': '1'
      };

      return watchlist.refresh(remoteWatchlist, 123456)
      .then(() => {
        // two files were updated and one added
        sinon.assert.calledThrice(watch.requestMSUpdate);
        watch.requestMSUpdate.getCalls().forEach(call =>{
          const [message, metaData] = call.args;

          assert.deepEqual(message, {
            topic: 'WATCH', filePath: metaData.filePath
          });
          assert.equal(metaData.status, 'UNKNOWN');

          switch (metaData.filePath) {
            case 'bucket/file1': return assert.equal(metaData.version, '1');
            case 'bucket/file2': return assert.equal(metaData.version, '2');
            case 'bucket/dir/file4': return assert.equal(metaData.version, '0');
            default: assert.fail(metaData.filePath);
          }
        });

        // addition inserts into metadata and watchlist
        sinon.assert.calledWith(db.fileMetadata.put, {
          filePath: 'bucket/dir/file4',
          version: '0',
          status: 'UNKNOWN'
        });

        sinon.assert.calledWith(db.watchlist.put, {
          filePath: 'bucket/dir/file4',
          version: '0',
          status: 'UNKNOWN'
        });

        sinon.assert.calledWith(db.watchlist.setLastChanged, 123456);
      });
    });

    it('refreshes the watchlist when there are no changes', () => {
      const testEntries = [
        {filePath: 'bucket/file1', status: 'CURRENT', version: '1'},
        {filePath: 'bucket/file2', status: 'CURRENT', version: '2'},
        {filePath: 'bucket/file3', status: 'CURRENT', version: '3'}
      ];

      sandbox.stub(db.fileMetadata, 'get').callsFake(filePath =>
        testEntries.find(entry => entry.filePath === filePath)
      );
      sandbox.stub(db.watchlist, 'allEntries').returns(testEntries);

      const remoteWatchlist = {
        'bucket/file1': '1',
        'bucket/file2': '2',
        'bucket/file3': '3'
      };

      return watchlist.refresh(remoteWatchlist, 123456)
      .then(() => {
        sinon.assert.notCalled(watch.requestMSUpdate);
        sinon.assert.notCalled(db.fileMetadata.put);

        sinon.assert.calledWith(db.watchlist.setLastChanged, 123456);
      });
    });

    it('rewatches folders that are present in local metadata but missing from remote watchlist', () => {
      const folderPath = "my-bucket/my-folder";

      db.fileMetadata.getAllFolders.restore();
      sandbox.stub(db.fileMetadata, 'getAllFolders')
      .returns([{filePath: folderPath, version: "0"}]);

      const testEntries = [
        {filePath: 'bucket/file1', status: 'CURRENT', version: '1'},
        {filePath: 'bucket/file2', status: 'CURRENT', version: '2'},
        {filePath: 'bucket/file3', status: 'CURRENT', version: '3'}
      ];

      sandbox.stub(db.fileMetadata, 'get').callsFake(filePath =>
        testEntries.find(entry => entry.filePath === filePath)
      );
      sandbox.stub(db.watchlist, 'allEntries').returns(testEntries);

      const remoteWatchlist = {
        'bucket/file2': '2',
        'bucket/file3': '3'
      };

      return watchlist.refresh(remoteWatchlist, 123456)
      .then(() => {
        sinon.assert.calledWithMatch(watch.requestMSUpdate, {filePath: folderPath, topic: 'watch'});
      });
    });

    it('does not refresh anything if there is no remote watchlist provided', () => {
      const testEntries = [
        {filePath: 'bucket/file1', status: 'CURRENT', version: '1'},
        {filePath: 'bucket/file2', status: 'CURRENT', version: '2'},
        {filePath: 'bucket/file3', status: 'CURRENT', version: '3'}
      ];

      sandbox.stub(db.fileMetadata, 'get').callsFake(filePath =>
        testEntries.find(entry => entry.filePath === filePath)
      );
      sandbox.stub(db.watchlist, 'allEntries').returns(testEntries);

      return watchlist.refresh({}, 123456)
      .then(() => {
        sinon.assert.notCalled(watch.requestMSUpdate);
        sinon.assert.notCalled(db.fileMetadata.put);
        sinon.assert.notCalled(db.watchlist.setLastChanged);
      });
    });

  });

});

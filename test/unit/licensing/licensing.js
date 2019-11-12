const sinon = require('sinon');
const fileSystem = require('../../../src/storage/file-system');
const fileServer = require('../../../src/storage/file-server');
const viewerMessaging = require('../../../src/messaging/viewer-messaging');
const storageMessaging = require('../../../src/storage/messaging/messaging');
const storageLocalMessaging = require('../../../src/storage/messaging/local-messaging-helper');
const systemInfo = require('../../../src/logging/system-info');
const logger = require('../../../src/logging/logger');
const util = require('../../../src/util');

const licensing = require('../../../src/licensing');

const sandbox = sinon.createSandbox();

describe('Licensing', () => {

  beforeEach(() => {
    sandbox.stub(logger, 'log');
    sandbox.stub(logger, 'error');
    sandbox.stub(systemInfo, 'isStageEnvironment').resolves(false);
    sandbox.stub(viewerMessaging, 'on');
    sandbox.stub(viewerMessaging, 'send');
    sandbox.stub(viewerMessaging, 'viewerCanReceiveContent').resolves(true);
  });

  afterEach(() => sandbox.restore());

  it('should respond to storage-licensing-request', () => {
    const fakeDisplayId = '12345';
    sandbox.stub(systemInfo, 'getDisplayId').resolves(fakeDisplayId);
    sandbox.stub(fileServer, 'getFileUrl').resolves('http://localhost/abcd123');
    sandbox.stub(storageMessaging, 'handleWatch').callsFake(forceRLSresponse);
    sandbox.stub(fileSystem, 'readCachedFileAsObject').resolves({authorized: true, companyId: 'companyId'});
    sandbox.stub(util, 'fetchWithRetry').resolves({json() {return [{status: "Subscribed"}]}});

    function forceRLSresponse() {
      storageLocalMessaging.sendFileUpdate({
        filePath: `risevision-display-notifications/${fakeDisplayId}/display.json`,
        version: '12345',
        status: 'CURRENT'
      })
    }

    return licensing.init()
    .then(()=>new Promise(res=>setTimeout(res, 0)))
    .then(()=>{
      const expectedMessage = {from: 'licensing', topic: 'storage-licensing-update', isAuthorized: true};
      sinon.assert.calledWith(viewerMessaging.send, expectedMessage);
      sinon.assert.calledWith(util.fetchWithRetry, "https://store-dot-rvaserver2.appspot.com/v1/company/companyId/product/status?pc=b0cba08a4baa0c62b8cdc621b6f6a124f89a03db");
    })
  });

  it('should respond to storage-licensing-request on stage environment', () => {

    systemInfo.isStageEnvironment.resolves(true);

    const fakeDisplayId = '12345';
    sandbox.stub(systemInfo, 'getDisplayId').resolves(fakeDisplayId);
    sandbox.stub(fileServer, 'getFileUrl').resolves('http://localhost/abcd123');
    sandbox.stub(storageMessaging, 'handleWatch').callsFake(forceRLSresponse);
    sandbox.stub(fileSystem, 'readCachedFileAsObject').resolves({authorized: true, companyId: 'companyId'});
    sandbox.stub(util, 'fetchWithRetry').resolves({json() {return [{status: "Subscribed"}]}});

    function forceRLSresponse() {
      storageLocalMessaging.sendFileUpdate({
        filePath: `risevision-display-notifications/${fakeDisplayId}/display.json`,
        version: '12345',
        status: 'CURRENT'
      })
    }

    return licensing.init()
    .then(()=>new Promise(res=>setTimeout(res, 0)))
    .then(()=>{
      const expectedMessage = {from: 'licensing', topic: 'storage-licensing-update', isAuthorized: true};
      sinon.assert.calledWith(viewerMessaging.send, expectedMessage);
      sinon.assert.calledWith(util.fetchWithRetry, "https://store-dot-rvacore-test.appspot.com/v1/company/companyId/product/status?pc=b0cba08a4baa0c62b8cdc621b6f6a124f89a03db");
    })
  });

  it('should respond to licensing-request', () => {
    const fakeDisplayId = '12345';
    sandbox.stub(systemInfo, 'getDisplayId').resolves(fakeDisplayId);
    sandbox.stub(fileServer, 'getFileUrl').resolves('http://localhost/abcd123');
    sandbox.stub(storageMessaging, 'handleWatch').callsFake(forceRLSresponse);
    sandbox.stub(fileSystem, 'readCachedFileAsObject').resolves({authorized: true});

    function forceRLSresponse() {
      storageLocalMessaging.sendFileUpdate({
        filePath: `risevision-display-notifications/${fakeDisplayId}/authorization/c4b368be86245bf9501baaa6e0b00df9719869fd.json`,
        version: '12345',
        status: 'CURRENT'
      })
    }

    return licensing.init()
    .then(()=>{
      return new Promise(res=>setTimeout(res, 0))
    }).then(()=>{
      viewerMessaging.on.withArgs('licensing-request').invokeCallback();

      const subscriptions = {
        "c4b368be86245bf9501baaa6e0b00df9719869fd": true
      };
      const expectedMessage = {from: 'licensing', topic: 'licensing-update', subscriptions};
      sinon.assert.calledWith(viewerMessaging.send, expectedMessage);
    });
  });
});

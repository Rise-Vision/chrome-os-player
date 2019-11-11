const sinon = require('sinon');

const logger = require('../../../src/logging/logger');
const Primus = require('../../../src/messaging/primus');

const messagingServiceClient = require('../../../src/messaging/messaging-service-client');

const sandbox = sinon.createSandbox();
const connection = {open() {}, on() {}, write() {}};

describe('Messaging Service Client', () => {

  after(() => chrome.flush());

  afterEach(() => sandbox.restore());

  beforeEach(() => {
    sandbox.stub(logger, 'log');

    sandbox.stub(connection, 'open');
    sandbox.stub(connection, 'on')
    sandbox.stub(Primus, 'connect').returns(connection);

    const displayId = 'displayId';
    const machineId = 'machineId';
    chrome.storage.local.get.yields({displayId, machineId});
  });

  it('should connect to messaging service', () => {
    connection.on.withArgs('open').yields();

    const expectedMSUrl = 'https://services.risevision.com/messaging/primus/?displayId=displayId&machineId=machineId';
    const expectedPrimusOptions = {reconnect: {max: 1800000, min: 2000, retries: Infinity}, manual: true};

    return messagingServiceClient.init().then(() => {
      sinon.assert.calledWith(Primus.connect, expectedMSUrl, expectedPrimusOptions);
      sinon.assert.calledOnce(connection.open);
    });
  });

  it('should connect to staging messaging service when player configured to stage', () => {
    const displayId = 'displayId';
    const machineId = 'machineId';
    chrome.storage.local.get.yields({displayId, machineId, environment: "stage"});

    connection.on.withArgs('open').yields();

    const expectedMSUrl = 'https://services-stage.risevision.com/messaging/primus/?displayId=displayId&machineId=machineId';
    const expectedPrimusOptions = {reconnect: {max: 1800000, min: 2000, retries: Infinity}, manual: true};

    return messagingServiceClient.init().then(() => {
      sinon.assert.calledWith(Primus.connect, expectedMSUrl, expectedPrimusOptions);
      sinon.assert.calledOnce(connection.open);
    });
  });

  function shouldLogEvent(eventName, logMessage) {
    connection.on.withArgs(eventName).yields();

    return messagingServiceClient.init().then(() => {
      sinon.assert.calledWith(logger.log, logMessage);
    });
  }

  it('should log connection opened event', () => {
    return shouldLogEvent('open', 'messaging - MS connection opened');
  });

  it('should log connection closed event', () => {
    connection.on.withArgs('open').yields();

    return shouldLogEvent('close', 'messaging - MS connection closed');
  });

  it('should log connection end event', () => {
    connection.on.withArgs('open').yields();

    return shouldLogEvent('end', 'messaging - MS disconnected');
  });

  it('should log reconnect event', () => {
    connection.on.withArgs('open').yields();

    return shouldLogEvent('reconnect', 'messaging - MS reconnection attempt started');
  });

  it('should log reconnected event', () => {
    connection.on.withArgs('open').yields();

    return shouldLogEvent('reconnected', 'messaging - MS successfully reconnected');
  });

  it('should log connection error event', () => {
    sandbox.stub(logger, 'error');

    const error = Error('testing');
    connection.on.withArgs('error').yields(error);

    const event = 'MS connection error';

    return messagingServiceClient.init().catch(() => {
      sinon.assert.calledWith(logger.error, `messaging - ${event}`, error);
    });
  });

  it('should invoke handlers when message is received', () => {
    const on = connection.on;
    on.withArgs('open').yields();

    const message = {filePath: 'path', version: 'version', type: 'ADD', topic: 'MSFILEUPDATE'};
    on.withArgs('data').yields(message);

    const handler = sandbox.spy();
    messagingServiceClient.on('MSFILEUPDATE', handler);
    return messagingServiceClient.init().then(() => {
      sinon.assert.calledWith(handler, message);
    });
  });

  it('should invoke handlers when message is received as string', () => {
    connection.on.withArgs('open').yields();

    const message = 'screenshot-request';
    connection.on.withArgs('data').yields(message);

    const handler = sandbox.spy();
    messagingServiceClient.on('screenshot-request', handler);
    return messagingServiceClient.init().then(() => {
      sinon.assert.calledWith(handler, message);
    });
  });

  it('should invoke handlers when message is received with msg string', () => {
    connection.on.withArgs('open').yields();

    const message = {msg: 'content-update'};
    connection.on.withArgs('data').yields(message);

    const handler = sandbox.spy();
    messagingServiceClient.on('content-update', handler);
    return messagingServiceClient.init().then(() => {
      sinon.assert.calledWith(handler, message);
    });
  });

  it('should not invoke handlers when message is not a string and has no topic', () => {
    connection.on.withArgs('open').yields();

    const message = {};
    connection.on.withArgs('data').yields(message);

    const handler = sandbox.spy();
    messagingServiceClient.on('screenshot-request', handler);
    return messagingServiceClient.init().then(() => {
      sinon.assert.notCalled(handler);
    });
  });

  it('should send messages', () => {
    connection.on.withArgs('open').yields();

    sandbox.stub(connection, 'write');

    const message = {};

    return messagingServiceClient.init().then(() => {
      messagingServiceClient.send(message);

      sinon.assert.calledWith(connection.write, message);
    });
  });

});

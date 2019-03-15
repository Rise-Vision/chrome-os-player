/* eslint-disable no-magic-numbers */
const assert = require('assert');
const sinon = require('sinon');
const util = require('../../../src/util');
const fileSystem = require('../../../src/storage/file-system');
const logger = require('../../../src/logging/logger');

const fileServer = require('../../../src/storage/file-server');

const sandbox = sinon.createSandbox();

describe('File Server', () => {

  beforeEach(() => {
    sandbox.stub(logger, 'log');
    sandbox.stub(logger, 'error');
  });

  afterEach(() => {
    chrome.flush();
    sandbox.restore();
  });

  it('should create http server', () => {
    const serverSocketInfo = {socketId: 1, name: 'file-server'};
    chrome.sockets.tcpServer.getSockets.yields([]);
    chrome.sockets.tcpServer.create.yields(serverSocketInfo);

    return fileServer.init().then(() => {
      sinon.assert.calledWith(chrome.sockets.tcpServer.listen, serverSocketInfo.socketId, '127.0.0.1', 8989);
    });
  });

  it('should stop existing server sockets', () => {
    const serverSocketInfo = {socketId: 3, name: 'file-server'};
    chrome.sockets.tcpServer.close.yields();
    chrome.sockets.tcpServer.getSockets.yields([{socketId: 1, name: 'file-server'}, {socketId: 2, name: 'file-server'}]);
    chrome.sockets.tcpServer.create.yields(serverSocketInfo);

    return fileServer.init().then(() => {
      sinon.assert.calledWith(chrome.sockets.tcpServer.close, 1);
      sinon.assert.calledWith(chrome.sockets.tcpServer.close, 2);
    });
  });

  it('should accept socket connections', () => {
    const serverSocketInfo = {socketId: 1, name: 'file-server'};
    chrome.sockets.tcpServer.getSockets.yields([]);
    chrome.sockets.tcpServer.create.yields(serverSocketInfo);

    const acceptInfo = {socketId: serverSocketInfo.socketId, clientSocketId: 1};

    return fileServer.init().then(() => {

      chrome.sockets.tcpServer.onAccept.dispatch(acceptInfo);

      sinon.assert.calledWith(chrome.sockets.tcp.setPaused, acceptInfo.clientSocketId, false);
      sinon.assert.calledOnce(chrome.sockets.tcp.onReceive.addListener);
    });
  });

  it('should not accept socket connections from another server', () => {
    const serverSocketInfo = {socketId: 1, name: 'file-server'};
    chrome.sockets.tcpServer.getSockets.yields([]);
    chrome.sockets.tcpServer.create.yields(serverSocketInfo);

    const acceptInfo = {socketId: 99, clientSocketId: 1};

    return fileServer.init().then(() => {

      chrome.sockets.tcpServer.onAccept.dispatch(acceptInfo);

      sinon.assert.notCalled(chrome.sockets.tcp.setPaused);
    });
  });

  it('should return file url', () => {
    const filePath = 'local-storage-test/1x1.png';
    const version = 'version';

    sandbox.stub(util, 'sha1').resolves('hash');

    return fileServer.getFileUrl(filePath, version).then((fileUrl) => {
      assert.equal(fileUrl, 'http://127.0.0.1:8989/hash');
    });
  });

  describe('requests', () => {
    beforeEach(() => {
      const serverSocketInfo = {socketId: 1, name: 'file-server'};
      chrome.sockets.tcpServer.getSockets.yields([]);
      chrome.sockets.tcpServer.create.yields(serverSocketInfo);
      chrome.sockets.tcp.getInfo.yields({connected: true});
      chrome.sockets.tcp.setKeepAlive.yields();
      chrome.sockets.tcp.send.yields();
    });

    it('should not accept POST', () => {
      sandbox.stub(util, 'arrayBufferToString').callsFake((buffer) => buffer);
      sandbox.stub(util, 'stringToArrayBuffer').callsFake((string) => string);

      const requestText =
        `POST / HTTP/1.1
        Host: localhost:8989
        User-Agent: curl/7.54.0
        Accept: */*
        Content-Length: 27
        Content-Type: application/x-www-form-urlencoded

        param1=value1&param2=value2`;

      const responseText = 'HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET\r\nContent-Length: 0\r\n\r\n';

      const acceptInfo = {socketId: 1, clientSocketId: 1};

      const receiveInfo = {data: requestText, socketId: 1};

      return fileServer.init().then(() => {
        chrome.sockets.tcpServer.onAccept.dispatch(acceptInfo);
        chrome.sockets.tcp.onReceive.dispatch(receiveInfo);

        sinon.assert.calledWith(chrome.sockets.tcp.setKeepAlive, receiveInfo.socketId, false);
        sinon.assert.calledWith(chrome.sockets.tcp.send, receiveInfo.socketId, responseText);
      });
    });

    it('should return not found when it receives a GET request for absent file', () => {
      sandbox.stub(util, 'arrayBufferToString').callsFake((buffer) => buffer);
      sandbox.stub(util, 'stringToArrayBuffer').callsFake((string) => string);

      const fileEntryPromise = Promise.reject(new Error('File not found'));
      sandbox.stub(fileSystem, 'readFile').returns(fileEntryPromise);

      const requestText =
        `GET /logo.png HTTP/1.1
        Host: 127.0.0.1:8989
        User-Agent: curl/7.54.0
        Accept: */*`;

      const acceptInfo = {socketId: 1, clientSocketId: 1};
      const receiveInfo = {data: requestText, socketId: 1};

      const responseText = 'HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET\r\nContent-Length: 0\r\n\r\n';

      return fileServer.init().then(() => {
        chrome.sockets.tcpServer.onAccept.dispatch(acceptInfo);
        chrome.sockets.tcp.onReceive.dispatch(receiveInfo);

        return Promise.all([fileEntryPromise]).catch(() => {
          sinon.assert.calledWith(chrome.sockets.tcp.setKeepAlive, receiveInfo.socketId, false);
          sinon.assert.calledWith(chrome.sockets.tcp.send, receiveInfo.socketId, responseText);
        });
      });
    });

    it('should accept GET request for existing file', () => {
      const fileEntry = {name: 'logo.png', size: 100, type: 'image/png'};
      const fileEntryPromise = Promise.resolve(fileEntry);
      sandbox.stub(fileSystem, 'readFile').returns(fileEntryPromise);
      const fileBufferPromise = Promise.resolve(new ArrayBuffer(fileEntry.size));
      sandbox.stub(fileSystem, 'readFileAsArrayBuffer').returns(fileBufferPromise);
      sandbox.stub(util, 'arrayBufferToString').callsFake((buffer) => buffer);
      sandbox.stub(util, 'stringToArrayBuffer').returns(new ArrayBuffer(100));

      const requestText =
        `GET /logo.png HTTP/1.1
        Host: 127.0.0.1:8989
        User-Agent: curl/7.54.0
        Accept: */*
        Connection: keep-alive`;

      const acceptInfo = {socketId: 1, clientSocketId: 1};
      const receiveInfo = {data: requestText, socketId: 1};

      return fileServer.init().then(() => {
        chrome.sockets.tcpServer.onAccept.dispatch(acceptInfo);
        chrome.sockets.tcp.onReceive.dispatch(receiveInfo);

        return Promise.all([fileEntryPromise, fileBufferPromise]).then(() => {
          sinon.assert.calledWith(chrome.sockets.tcp.setKeepAlive, receiveInfo.socketId, true);
          sinon.assert.calledOnce(chrome.sockets.tcp.send);
          const socketId = chrome.sockets.tcp.send.lastCall.args[0];
          assert.equal(socketId, acceptInfo.clientSocketId);
          const buffer = chrome.sockets.tcp.send.lastCall.args[1];
          assert.equal(buffer.byteLength, 100);
        });
      });
    });

  });

});

const logger = require('../logging/logger');
const util = require('../util');

/* eslint-disable max-statements */
const address = '127.0.0.1'
const port = 9494;
const tcp = chrome.sockets.tcp;
const sockets = new Set();

module.exports = {
  init
}

function init() {
  chrome.sockets.tcpServer.create(socketInfo=>{
    chrome.sockets.tcpServer.onAccept.addListener(onAccept.bind(null, socketInfo.socketId));
    chrome.sockets.tcpServer.onAcceptError.addListener(console.error);
    tcp.onReceive.addListener(onReceive);
    chrome.sockets.tcpServer.listen(socketInfo.socketId, address, port, result=>{
      logger.log(`display id server is listening on ${address}:${port}: ${result}`);
    });
  });
}

function onAccept(serverSocketId, acceptInfo) {
  if (acceptInfo.socketId !== serverSocketId) {return;}
  tcp.setPaused(acceptInfo.clientSocketId, false);
  sockets.add(acceptInfo.clientSocketId);
}

function onReceive({data, socketId}) {
  if (!sockets.has(socketId)) {return;}
  const requestText = util.arrayBufferToString(data);
  console.log(`request received:\n${requestText}`);

  const uri = util.parseUri(requestText);
  if (uri !== "/displays") {
    return sendResponse(socketId, '400 Bad Request');
  }

  return util.getDisplayId()
  .then(displayId=>sendResponse(socketId, '200 OK', JSON.stringify({displayId})))
  .catch(err=>logger.error('marketwall - display id error', err))
}

function sendResponse(socketId, httpStatus = '', content = '') {
  const headers = [
    `HTTP/1.1 ${httpStatus}`,
    `Content-Type: application/json`,
    `Content-Length: ${content.length}`,
    'Transfer-Encoding: identity',
    'Connection: close'
  ];

  const headerText = headers.join('\r\n') + '\r\n\r\n'; // eslint-disable-line prefer-template

  if (httpStatus.includes("OK")) {logger.log('marketwall display id', content)}

  console.log(`sending response:\n${headerText + content}`); // eslint-disable-line prefer-template
  const responseBuffer = util.stringToArrayBuffer(headerText + content);

  tcp.getInfo(socketId, socketInfo => {
    if (socketInfo && !socketInfo.connected) {
      sockets.delete(socketId);
      tcp.close(socketId);
      return;
    }

    tcp.send(socketId, responseBuffer, sendResult => {
      console.log(`sent`, sendResult);

      if (chrome.runtime.lastError) {
        logger.error('marketwall - send display id error', Error(chrome.runtime.lastError.message));
      }

      sockets.delete(socketId);
      tcp.disconnect(socketId, () => tcp.close(socketId));
    });
  });
}

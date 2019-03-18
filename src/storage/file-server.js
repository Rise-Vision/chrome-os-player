const util = require('../util');
const fileSystem = require('./file-system');
const logger = require('../logging/logger');

/* eslint-disable max-statements */
const sockets = new Set();
let serverSocketId = null;
const address = '127.0.0.1'
const port = 8989;

function getFileUrl(filePath, version) {
  return util.sha1(`${filePath}${version}`).then((hash) => `http://${address}:${port}/${hash}`);
}

function init() {
  return stopExisting().then(() => create());
}

function stopExisting() {
  return new Promise((resolve, reject) => {
    chrome.sockets.tcpServer.getSockets((existingSockets) => {
      const promises = existingSockets.filter(socket => socket.name === 'file-server').map(fileServer => {
        return new Promise((res) => chrome.sockets.tcpServer.close(fileServer.socketId, res));
      });

      Promise.all(promises).then(resolve).catch(reject);
    });
  });
}

function create() {
  chrome.sockets.tcpServer.create({name: 'file-server'}, (socketInfo) => {
    serverSocketId = socketInfo.socketId;
    chrome.sockets.tcpServer.onAccept.addListener(onAccept);
    chrome.sockets.tcpServer.onAcceptError.addListener(console.error);
    chrome.sockets.tcp.onReceive.addListener(onReceive);
    chrome.sockets.tcpServer.listen(socketInfo.socketId, address, port, (result) => {
      logger.log(`http server is listening on ${address}:${port}: ${result}`);
    });
  });
}

function onAccept(acceptInfo) {
  if (acceptInfo.socketId !== serverSocketId) {
    return;
  }

  sockets.add(acceptInfo.clientSocketId);
  chrome.sockets.tcp.setPaused(acceptInfo.clientSocketId, false);
}

function onReceive({data, socketId}) {
  if (!sockets.has(socketId)) {return;}

  const requestText = util.arrayBufferToString(data);
  console.log(`request received:\n ${requestText}`);
  const keepAlive = requestText.indexOf('Connection: keep-alive') > 0;
  const uri = util.parseUri(requestText);
  if (!uri) {
    return sendResponse(socketId, '400 Bad Request', keepAlive);
  }

  const fileName = uri.slice(uri.indexOf('/') + 1);
  fileSystem.readFile(fileName, 'cache')
    .then(file => sendResponse(socketId, '200 OK', keepAlive, file))
    .catch(error => {
      logger.error(`storage - responding with 404 due to error when handling file`, error, {fileName});
      sendResponse(socketId, '404 Not Found', keepAlive);
    });
}

function sendResponse(socketId, httpStatus, keepAlive, file) {
  const headerBuffer = createResponseHeader(httpStatus, keepAlive, file);
  if (!file) {
    return sendBuffer({socketId, buffer: headerBuffer, keepAlive});
  }

  const chunks = [sendBuffer.bind(this, {socketId, buffer: headerBuffer, keepAlive: true})];
  const slices = fileSystem.sliceFileInChunks(file);
  slices.forEach((slice) => {
    chunks.push(readAndSendChunk.bind(this, slice, socketId));
  });

  const lastChunk = util.stringToArrayBuffer('');
  chunks.push(sendChunkBuffer.bind(this, {socketId, data: lastChunk, last: true}));

  console.log(`sending ${chunks.length} chunks to socket ${socketId}`);

  return chunks.reduce((soFar, next) => {
    return soFar.then(() => next());
  }, Promise.resolve());
}

function readAndSendChunk(chunk, socketId) {
  return fileSystem.readFileAsArrayBuffer(chunk)
      .then((fileBuffer) => {
        return sendChunkBuffer({socketId, data: fileBuffer});
      });
}

function sendChunkBuffer({socketId, data, last = false}) {
  if (last) {console.log(`sending last chunk to socket ${socketId}`);}

  const newline = '\r\n';
  const chunkLength = data.byteLength.toString(16).toUpperCase() + newline; // eslint-disable-line
  const chunkStartBuffer = util.stringToArrayBuffer(chunkLength);

  const chunkEnd = last ? `${newline}${newline}` : newline;
  const chunkEndBuffer = util.stringToArrayBuffer(chunkEnd);

  const outputBuffer = new ArrayBuffer(chunkStartBuffer.byteLength + data.byteLength + chunkEndBuffer.byteLength);
  const bufferView = new Uint8Array(outputBuffer);
  bufferView.set(new Uint8Array(chunkStartBuffer), 0);
  bufferView.set(new Uint8Array(data), chunkStartBuffer.byteLength);
  bufferView.set(new Uint8Array(chunkEndBuffer), chunkStartBuffer.byteLength + data.byteLength);

  const keepAlive = !last;
  return sendBuffer({socketId, buffer: outputBuffer, keepAlive});
}

function sendBuffer({socketId, buffer, keepAlive}) {
  return new Promise((resolve) => {
    // verify that socket is still connected before trying to send data
    chrome.sockets.tcp.getInfo(socketId, (socketInfo) => {
      if (chrome.runtime.lastError || !(socketInfo && socketInfo.connected)) {
        return resolve(destroySocketById(socketId));
      }
      const delayInSeconds = 1;
      chrome.sockets.tcp.setKeepAlive(socketId, keepAlive, delayInSeconds, () => {
        if (chrome.runtime.lastError) {
          return resolve(destroySocketById(socketId));
        }

        chrome.sockets.tcp.send(socketId, buffer, (writeInfo) => {
          console.log(`sent`, writeInfo);
          if (!keepAlive || chrome.runtime.lastError) {
            destroySocketById(socketId);
          }
          resolve();
        });
      });
    });
  });

}

function createResponseHeader(httpStatus, keepAlive, file) {
  const contentType = (file && file.type) || 'text/plain'; // eslint-disable-line no-extra-parens
  const lines = [
    `HTTP/1.1 ${httpStatus}`,
    `Content-Type: ${contentType}`,
    'Access-Control-Allow-Origin: *',
    'Access-Control-Allow-Methods: GET'
  ];

  if (keepAlive) {
    lines.push('Connection: keep-alive');
  }

  if (file) {
    lines.push('Transfer-Encoding: chunked');
  } else {
    lines.push('Content-Length: 0');
  }

  const responseText = lines.join('\r\n') + '\r\n\r\n' // eslint-disable-line prefer-template
  console.log(`sending response:\n ${responseText}`);
  return util.stringToArrayBuffer(responseText);
}

function destroySocketById(socketId) {
  sockets.delete(socketId);

  chrome.sockets.tcp.getInfo(socketId, (socketInfo) => {
    if (chrome.runtime.lastError) {return;}

    if (socketInfo && socketInfo.connected) {
      chrome.sockets.tcp.disconnect(socketId, () => chrome.sockets.tcp.close(socketId));
    } else {
      chrome.sockets.tcp.close(socketId);
    }
  });
}

module.exports = {
  init,
  getFileUrl
}

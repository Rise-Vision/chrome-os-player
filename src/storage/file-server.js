const util = require('./util');
const fileSystem = require('./file-system');

/* eslint-disable max-statements */
const sockets = new Set();
let serverSocketId = null;

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

function create(address = '127.0.0.1', port = 8989) { // eslint-disable-line no-magic-numbers
  chrome.sockets.tcpServer.create({name: 'file-server'}, (socketInfo) => {
    serverSocketId = socketInfo.socketId;
    chrome.sockets.tcpServer.onAccept.addListener(onAccept);
    chrome.sockets.tcpServer.onAcceptError.addListener(console.error);
    chrome.sockets.tcp.onReceive.addListener(onReceive);
    chrome.sockets.tcpServer.listen(socketInfo.socketId, address, port, (result) => {
      console.log(`http server is listening on ${address}:${port}: ${result}`);
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

  const string = util.arrayBufferToString(data);
  console.log(`request received: ${string}`);
  const keepAlive = string.indexOf('Connection: keep-alive') > 0;
  const uri = util.parseUri(string);
  if (!uri) {
    return sendResponse(socketId, '400 Bad Request', keepAlive);
  }

  console.log(`read file from uri ${uri}`);
  const fileName = uri.slice(uri.indexOf('/') + 1);
  fileSystem.readFile(fileName, 'cache')
    .then(file => sendResponse(socketId, '200 OK', keepAlive, file))
    .catch((error) => {
      console.log(error);
      sendResponse(socketId, '404 Not Found', keepAlive);
    });
}

function sendResponse(socketId, httpStatus, keepAlive, file) {
  const headerBuffer = createResponseHeader(httpStatus, keepAlive, file);
  if (!file) {
    return sendBuffer(socketId, headerBuffer, keepAlive);
  }

  const sendOperations = [sendBuffer.bind(this, socketId, headerBuffer, true)];
  const chunks = fileSystem.readChunks(file);
  chunks.forEach(({start, end, slice}) => {
    console.log(`send chunk ${start} ${end}`);
    const operation = readAndSendChunk.bind(this, slice, socketId, start, end);
    sendOperations.push(operation);
  });

  const lastChunk = util.stringToArrayBuffer('');
  sendOperations.push(sendChunkBuffer.bind(this, socketId, lastChunk, -1, -1, true)); // eslint-disable-line

  console.log(sendOperations);

  return sendOperations.reduce((soFar, next) => {
    return soFar.then(() => next.apply()); // eslint-disable-line
  }, Promise.resolve());
}

function readAndSendChunk(chunk, socketId, start, end) { // eslint-disable-line
  console.log(`readAndSendChunk ${start} ${end}`);
  return fileSystem.readFileAsArrayBuffer(chunk)
      .then((fileBuffer) => {
        return sendChunkBuffer(socketId, fileBuffer, start, end);
      });
}

function sendChunkBuffer(socketId, data, start, end, last) { // eslint-disable-line
  console.log(`sendChunkBuffer ${start} ${end}`, data);
  const newline = '\r\n';
  const chunkLength = data.byteLength.toString(16).toUpperCase() + newline; // eslint-disable-line
  const newlineLength = newline.length; // eslint-disable-line
  const buffer = new ArrayBuffer(chunkLength.length + data.byteLength + newlineLength);
  const bufferView = new Uint8Array(buffer);
  for (let i = 0; i < chunkLength.length; i++) { // eslint-disable-line
    bufferView[i] = chunkLength.charCodeAt(i);
  }

  bufferView.set(new Uint8Array(data), chunkLength.length);

  const lineBreak = last ? `${newline}${newline}` : newline;
  for (let i = 0; i < lineBreak.length; i++) { // eslint-disable-line
    bufferView[chunkLength.length + data.byteLength + i] = lineBreak.charCodeAt(i);
  }
  const keepAlive = !last;
  return sendBuffer(socketId, buffer, keepAlive, start, end);
}

function sendBuffer(socketId, buffer, keepAlive, start, end) { // eslint-disable-line
  console.log(`sendBuffer ${start} ${end}`);
  // console.log(util.arrayBufferToString(buffer).replace(/\r\n/g, '<CR><LF>'));

  return new Promise((resolve) => {
    // verify that socket is still connected before trying to send data
    chrome.sockets.tcp.getInfo(socketId, (socketInfo) => {
      if (chrome.runtime.lastError || !(socketInfo && socketInfo.connected)) {
        return resolve(destroySocketById(socketId));
      }
      chrome.sockets.tcp.setKeepAlive(socketId, keepAlive, () => {
        if (chrome.runtime.lastError) {
          return resolve(destroySocketById(socketId));
        }

        chrome.sockets.tcp.send(socketId, buffer, (writeInfo) => {
          console.log(`send ${start} ${end}`, writeInfo);
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
  const contentType = (file && file.type) || 'text/plain'; // eslint-disable-line
  const lines = [
    `HTTP/1.1 ${httpStatus}`,
    `Content-Type: ${contentType}`
  ];

  if (keepAlive) {
    lines.push('Connection: keep-alive');
  }

  if (file) {
    lines.push('Transfer-Encoding: chunked');
  } else {
    lines.push('Content-Length: 0');
  }

  const responseText = lines.join('\r\n') + '\r\n\r\n' // eslint-disable-line
  console.log(`sending response: ${responseText}`)
  return util.stringToArrayBuffer(responseText);
}

function destroySocketById(socketId) {
  sockets.delete(socketId);

  chrome.sockets.tcp.getInfo(socketId, (socketInfo) => {
    if (socketInfo && socketInfo.connected) {
      chrome.sockets.tcp.disconnect(socketId, () => chrome.sockets.tcp.close(socketId));
    } else {
      chrome.sockets.tcp.close(socketId);
    }
  });
}

module.exports = {
  init
}

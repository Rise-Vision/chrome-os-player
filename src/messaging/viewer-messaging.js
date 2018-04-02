const dataHandlerRegisteredObserver = {resolve: () => {}, messageReceived: false};
const messageHandlers = {};
let messageSender = null;

function createMessageSender(webview) {
  return {
    sendMessage(message) {
      webview.contentWindow.postMessage(message, webview.src);
    }
  }
}

function init(webview) {
  messageSender = createMessageSender(webview);

  on('data-handler-registered', () => {
    dataHandlerRegisteredObserver.messageReceived = true;
    dataHandlerRegisteredObserver.resolve();
  });

  on('client-list-request', () => {
    const installedClients = ['local-storage', 'local-messaging'];
    const message = {from: 'local-messaging', topic: 'client-list', installedClients, clients: installedClients};
    send(message);
  });

  window.addEventListener('message', (event) => {
    if (!event.data) {return;}

    event.preventDefault();

    console.log(`viewer window received message from webview: ${JSON.stringify(event.data)}`);
    handleMessage(event.data);
  });
}

function on(topic, handler) {
  const key = topic.toLowerCase();
  if (!messageHandlers[key]) {
    messageHandlers[key] = [];
  }

  messageHandlers[key].push(handler);
}

function send(message) {
  if (messageSender) {
    messageSender.sendMessage(message);
  }
}

function handleMessage(data) {
  const key = data.topic || data.message || data;
  if (typeof key === 'string') {
    const handlers = messageHandlers[key.toLowerCase()];
    if (handlers && handlers.length > 0) {
      handlers.forEach(handler => handler(data));
    }
  }
}

function viewerCanReceiveContent() {
  return new Promise(resolve => {
    dataHandlerRegisteredObserver.resolve = resolve;
    if (dataHandlerRegisteredObserver.messageReceived) {
      resolve();
    }
  });
}

module.exports = {
  init,
  on,
  send,
  viewerCanReceiveContent
}
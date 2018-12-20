const dataHandlerRegisteredObserver = {
  init() {
    this.messageReceived = false;
    this.resolvers = [];
  },
  resolve() {
    while (this.resolvers.length > 0) {
      const fn = this.resolvers.pop();
      fn();
    }
  }
};
const messageHandlers = {};
let messageSender = null;

function createMessageSender(webview, targetOrigin = webview.src) {
  return {
    sendMessage(message) {
      webview.contentWindow.postMessage(message, targetOrigin);
    }
  }
}

function init() {
  dataHandlerRegisteredObserver.init();

  on('data-handler-registered', () => {
    dataHandlerRegisteredObserver.messageReceived = true;
    dataHandlerRegisteredObserver.resolve();
  });

  on('client-list-request', () => {
    const installedClients = ['local-storage', 'local-messaging', 'licensing'];
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

function once(topic, handler) {
  const key = topic.toLowerCase();
  if (!messageHandlers[key]) {
    messageHandlers[key] = [];
  }

  messageHandlers[key].push((data) => {
    handler(data);
    messageHandlers[key] = [];
  });
}

function removeAllListeners(topic) {
  const key = topic.toLowerCase();
  messageHandlers[key] = [];
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
    dataHandlerRegisteredObserver.resolvers.push(resolve);
    if (dataHandlerRegisteredObserver.messageReceived) {
      dataHandlerRegisteredObserver.resolve();
    }
  });
}

function reset() {
  dataHandlerRegisteredObserver.resolvers = [];
  dataHandlerRegisteredObserver.messageReceived = false;
}

function configure(webview) {
  messageSender = createMessageSender(webview);
}

module.exports = {
  init,
  on,
  once,
  removeAllListeners,
  send,
  viewerCanReceiveContent,
  reset,
  configure
}

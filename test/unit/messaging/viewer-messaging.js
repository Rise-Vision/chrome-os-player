const sinon = require('sinon');
const chrome = require('sinon-chrome/apps');

const viewerMessaging = require('../../../src/messaging/viewer-messaging');
const scheduleParser = require('../../../src/scheduling/schedule-parser');

const sandbox = sinon.createSandbox();
const window = {addEventListener() {}};
const webview = {src: 'src', contentWindow: {postMessage() {}}};
let onMessageEvent = null

describe('Viewer Messaging', () => {

  before(() => global.window = window);
  after(() => Reflect.deleteProperty(global, 'window'))

  after(() => chrome.flush());

  afterEach(() => sandbox.restore());

  beforeEach(() => {
    sandbox.stub(window, 'addEventListener').callsFake((event, listener) => onMessageEvent = listener);
    viewerMessaging.init();
    viewerMessaging.configure(webview);
  })

  it('should indicate viewer can receive content when it receives data-handler-registered', () => {
    const promise = viewerMessaging.viewerCanReceiveContent();

    const data = {from: 'viewer', message: 'data-handler-registered'};
    onMessageEvent({data, preventDefault() {}});

    return promise;
  });

  it('should indicate viewer can receive content if it has already received data-handler-registered', () => {
    const promise = viewerMessaging.viewerCanReceiveContent();
    const data = {from: 'viewer', message: 'data-handler-registered'};
    onMessageEvent({data, preventDefault() {}});

    return promise;
  });

  it('should indicate viewer can receive content for multiple callers', () => {
    const data = {from: 'viewer', message: 'data-handler-registered'};
    const promises = [viewerMessaging.viewerCanReceiveContent(), viewerMessaging.viewerCanReceiveContent()];

    onMessageEvent({data, preventDefault() {}});

    return Promise.all(promises);
  });

  it('should not wait for message from Viewer when running in no-Viewer mode', () => {
    sandbox.stub(scheduleParser, 'hasOnlyNoViewerURLItems').returns(true);

    const promise = viewerMessaging.viewerCanReceiveContent();

    return promise;
  });

  it('should respond to client list request message', () => {
    sandbox.stub(webview.contentWindow, 'postMessage');

    const data = {from: 'ws-client', topic: 'client-list-request'};
    onMessageEvent({data, preventDefault() {}});

    const expectedClientListResponse = {from: 'local-messaging', topic: 'client-list', installedClients: ['local-storage', 'local-messaging', 'licensing'], clients: ['local-storage', 'local-messaging', 'licensing']};

    sinon.assert.calledWith(webview.contentWindow.postMessage, expectedClientListResponse, webview.src);
  });

  it('should invoke handlers when message is received', () => {
    const eventHandler = sandbox.spy();
    viewerMessaging.on('watch', eventHandler);

    const data = {from: 'ws-client', topic: 'WATCH', filePath: 'local-storage-test/test-1x1.png'};
    onMessageEvent({data, preventDefault() {}});

    sinon.assert.calledWith(eventHandler, data);
  });

  it('should invoke handlers when message is received as string', () => {
    const eventHandler = sandbox.spy();
    viewerMessaging.on('someEvent', eventHandler);

    const data = 'someEvent';
    onMessageEvent({data, preventDefault() {}});

    sinon.assert.calledWith(eventHandler, data);
  });

  it('should invoke handlers when message is received with message string', () => {
    const eventHandler = sandbox.spy();
    viewerMessaging.on('widget-ready', eventHandler);

    const data = {message: 'widget-ready', widgetUrl: 'http://widgets.risevision.com/widget-image/0.1.1/dist/widget.html', from: 'viewer'};
    onMessageEvent({data, preventDefault() {}});

    sinon.assert.calledWith(eventHandler, data);
  });

  it('should not invoke handlers when message is not a string and has no topic', () => {
    const eventHandler = sandbox.spy();
    viewerMessaging.on('event', eventHandler);

    const data = {};
    onMessageEvent({data, preventDefault() {}});

    sinon.assert.notCalled(eventHandler);
  });

  it('should send messages', () => {
    sandbox.stub(webview.contentWindow, 'postMessage');

    const message = 'hello';
    viewerMessaging.send(message);

    sinon.assert.calledWith(webview.contentWindow.postMessage, message, webview.src);
  });

  it('should handle messages once', () => {
    const eventHandler = sandbox.spy();
    viewerMessaging.once('widget-ready', eventHandler);

    const data = {message: 'widget-ready', widgetUrl: 'http://widgets.risevision.com/widget-image/0.1.1/dist/widget.html', from: 'viewer'};
    onMessageEvent({data, preventDefault() {}});
    onMessageEvent({data, preventDefault() {}});

    sinon.assert.calledOnce(eventHandler);
  });

  it('should remove all listeners', () => {
    const eventHandler = sandbox.spy();
    viewerMessaging.on('widget-ready', eventHandler);

    const data = {message: 'widget-ready', widgetUrl: 'http://widgets.risevision.com/widget-image/0.1.1/dist/widget.html', from: 'viewer'};
    onMessageEvent({data, preventDefault() {}});

    viewerMessaging.removeAllListeners('widget-ready');

    onMessageEvent({data, preventDefault() {}});

    sinon.assert.calledOnce(eventHandler);
  });

});

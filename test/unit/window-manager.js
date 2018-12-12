const sinon = require('sinon');
const chrome = require('sinon-chrome/apps');
const windowManager = require('../../src/window-manager');

const sandbox = sinon.createSandbox();

const expectedDefaultOuterBounds = {
  width: 900,
  height: 900,
  left: 50,
  top: 50
};

describe('Window Manager', () => {

  before(() => global.screen = {availWidth: 1000, availHeight: 1000});

  after(() => {
    chrome.flush();
    Reflect.deleteProperty(global, 'screen');
  });

  afterEach(() => {
    sandbox.restore();
    chrome.flush();
  });

  it('should launch registration', () => {
    const expectedWindowOptions = {
      id: 'registration',
      outerBounds: expectedDefaultOuterBounds
    };

    windowManager.startRegistration();

    sinon.assert.calledWith(chrome.app.window.create, 'registration.html', expectedWindowOptions);
  });

  it('should launch player', () => {
    const expectedWindowOptions = {state: 'fullscreen', outerBounds: expectedDefaultOuterBounds};

    const displayId = 'displayId';
    windowManager.launchPlayer(displayId);

    sinon.assert.calledWith(chrome.app.window.create, 'player.html', expectedWindowOptions);
  });

  it('should close previous window when player is launched', () => {
    const viewerWindow = {
      onClosed: {addListener() {}},
      contentWindow: {
        addEventListener() {},
        document: {
          querySelector() {}
        }
      }
    }
    sandbox.stub(viewerWindow.onClosed, 'addListener').yields([]);
    sandbox.stub(viewerWindow.contentWindow, 'addEventListener').yields([]);
    sandbox.stub(viewerWindow.contentWindow.document, 'querySelector').returns({addEventListener() {}});
    chrome.app.window.create.yields(viewerWindow);

    const previousWindow = {close: sinon.spy()};
    chrome.app.window.current.returns(previousWindow);

    const displayId = 'displayId';
    return windowManager.launchPlayer(displayId).then(() => {
      sinon.assert.calledOnce(previousWindow.close);
    });
  });

  it('should request keep awake when player is launched', () => {
    const displayId = 'displayId';
    windowManager.launchPlayer(displayId);

    sinon.assert.calledWith(chrome.power.requestKeepAwake, 'display');
  });

  it('should release keep awake when player is closed', () => {
    const previousWindow = {close: sinon.spy()};
    chrome.app.window.current.returns(previousWindow);

    const viewerWindow = {
      onClosed: {addListener() {}},
      contentWindow: {
        addEventListener() {},
        document: {
          querySelector() {}
        }
      }
    };
    sandbox.stub(viewerWindow.onClosed, 'addListener').yields([]);
    sandbox.stub(viewerWindow.contentWindow, 'addEventListener').yields([]);
    sandbox.stub(viewerWindow.contentWindow.document, 'querySelector').returns({addEventListener() {}});
    chrome.app.window.create.yields(viewerWindow);

    const displayId = 'displayId';
    return windowManager.launchPlayer(displayId).then(() => {
      sinon.assert.calledOnce(chrome.power.releaseKeepAwake);
    });
  });

  it('should launch web view', () => {
    const url = 'https://www.risevision.com/terms-service-privacy';
    windowManager.launchWebView(url);

    const expectedWindowOptions = {outerBounds: expectedDefaultOuterBounds};
    sinon.assert.calledWith(chrome.app.window.create, 'webview.html', expectedWindowOptions);
  });

  it('should close all windows', () => {
    const stub = {close: sandbox.spy()};
    const windows = [stub, stub, stub];
    chrome.app.window.getAll.returns(windows);

    windowManager.closeAll();

    sinon.assert.callCount(stub.close, windows.length);
  });

  it('should close current window', () => {
    const stub = {close: sandbox.spy()};
    chrome.app.window.current.returns(stub);

    windowManager.closeCurrentWindow();

    sinon.assert.called(stub.close);
  });

});

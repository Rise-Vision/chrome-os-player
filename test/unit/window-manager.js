const assert = require('assert');
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
    chrome.app.window.create.flush();
  });

  it('should launch player', () => {
    const expectedWindowOptions = {
      id: 'registration',
      outerBounds: expectedDefaultOuterBounds
    };

    windowManager.startRegistration();

    assert(chrome.app.window.create.calledWith('registration.html', expectedWindowOptions), 'chrome.app.window.create should have been called');
  });

  it('should release keep awake when player is closed', () => {
    const playerWindow = {onClosed: {addListener() {}}};
    sandbox.stub(playerWindow.onClosed, 'addListener').yields([]);
    chrome.app.window.create.yields(playerWindow);

    windowManager.startRegistration();

    assert(chrome.power.releaseKeepAwake.calledOnce, 'chrome.power.releaseKeepAwake should have been called');
  });

  it('should launch viewer', () => {
    const expectedWindowOptions = {id: 'viewer', state: 'fullscreen', outerBounds: expectedDefaultOuterBounds};

    const displayId = 'displayId';
    windowManager.launchViewer(displayId);

    assert(chrome.app.window.create.calledWith('viewer.html', expectedWindowOptions), 'chrome.app.window.create should have been called');
  });

  it('should release keep awake when viewer is closed', () => {
    const viewerWindow = {onClosed: {addListener() {}}, contentWindow: {addEventListener() {}}};
    sandbox.stub(viewerWindow.onClosed, 'addListener').yields([]);
    chrome.app.window.create.yields(viewerWindow);

    const displayId = 'displayId';
    windowManager.launchViewer(displayId);

    assert(chrome.power.releaseKeepAwake.calledOnce, 'chrome.power.releaseKeepAwake should have been called');
  });

  it('should launch web view', () => {
    const url = 'https://www.risevision.com/terms-service-privacy';
    windowManager.launchWebView(url);

    const expectedWindowOptions = {outerBounds: expectedDefaultOuterBounds};
    assert(chrome.app.window.create.calledWith('webview.html', expectedWindowOptions), 'chrome.app.window.create should have been called');
  });

  it('should close all windows', () => {
    const stub = {close: sandbox.spy()};
    const windows = [stub, stub, stub];
    chrome.app.window.getAll.returns(windows);

    windowManager.closeAll();

    sinon.assert.callCount(stub.close, windows.length);
  });

});

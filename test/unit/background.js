const sinon = require('sinon');
const windowManager = require('../../src/window-manager');
const launchEnvs = require('../../src/launch-environment');
const logger = require('../../src/logging/logger');

const sandbox = sinon.createSandbox();

describe('background script', () => {

  beforeEach(() => {
    sandbox.stub(logger, 'log');
    sandbox.stub(launchEnvs, "set");
    require('../../src/background'); // eslint-disable-line global-require
  });

  afterEach(() => sandbox.restore());

  after(() => chrome.flush());

  it('should launch player when app is launched', () => {
    sandbox.stub(windowManager, 'startRegistration');
    chrome.storage.local.get.yields({});

    sinon.assert.calledOnce(chrome.app.runtime.onLaunched.addListener);

    chrome.app.runtime.onLaunched.dispatch({});

    sinon.assert.calledOnce(windowManager.startRegistration);
  });

  it('should launch viewer when app is launched and there is a saved display id', () => {
    sandbox.stub(windowManager, 'launchViewer');

    const displayId = 'displayId';
    chrome.storage.local.get.yields({displayId});

    chrome.app.runtime.onLaunched.dispatch({});

    sinon.assert.calledWith(windowManager.launchViewer, displayId);
  });

  it('should close all windows when restart is required', () => {
    sandbox.stub(windowManager, 'closeAll');

    sinon.assert.calledOnce(chrome.runtime.onRestartRequired.addListener);

    chrome.runtime.onRestartRequired.dispatch();

    sinon.assert.calledOnce(windowManager.closeAll);
  });

  it('should request keep awake', () => {
    sinon.assert.calledWith(chrome.power.requestKeepAwake, 'display');
  });

  it('should check for updates when app is launched', () => {
    chrome.runtime.requestUpdateCheck.flush();
    sandbox.stub(windowManager, 'startRegistration');
    chrome.storage.local.get.yields({});

    chrome.app.runtime.onLaunched.dispatch({});

    sinon.assert.calledOnce(chrome.runtime.requestUpdateCheck);
  });

  it('should restart when update is available', () => {
    chrome.runtime.onUpdateAvailable.dispatch({});

    sinon.assert.calledOnce(chrome.runtime.restart);
  });

});

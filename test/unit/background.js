const sinon = require('sinon');
const windowManager = require('../../src/window-manager');
const launchEnvs = require('../../src/launch-environment');
const networkChecks = require('../../src/network-checks');
const logger = require('../../src/logging/logger');

const sandbox = sinon.createSandbox();

describe('background script', () => {

  before(() => {
    global.window = {addEventListener() {}};
  });

  after(() => Reflect.deleteProperty(global, 'window'));

  beforeEach(() => {
    sandbox.stub(logger, 'log');
    sandbox.stub(launchEnvs, 'set');
    sandbox.stub(networkChecks, 'checkSites').resolves()
    chrome.runtime.getManifest.returns({version: '0.0.0.0'});
    require('../../src/background'); // eslint-disable-line global-require
  });

  afterEach(() => sandbox.restore());

  after(() => chrome.flush());

  it('should start registration when app is launched', () => {
    sandbox.stub(windowManager, 'startRegistration');
    chrome.storage.local.get.yields({});

    sinon.assert.calledOnce(chrome.app.runtime.onLaunched.addListener);

    chrome.app.runtime.onLaunched.dispatch({});

    sinon.assert.calledOnce(windowManager.startRegistration);
  });

  it('should close all windows when restart is required', () => {
    sandbox.stub(windowManager, 'closeAll');

    sinon.assert.calledOnce(chrome.runtime.onRestartRequired.addListener);

    chrome.runtime.onRestartRequired.dispatch();

    sinon.assert.calledOnce(windowManager.closeAll);
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

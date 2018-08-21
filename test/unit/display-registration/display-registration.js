/* eslint-disable func-style */
const assert = require('assert');
const sinon = require('sinon');
const chrome = require('sinon-chrome/apps');
const screen = require('../../../src/display-registration/display-registration');
const networkChecks = require('../../../src/network-checks');

const sandbox = sinon.createSandbox();

describe('Display ID Screen', () => {

  const viewModel = {
    bindRegistrationFunction() {},
    showEmptyDisplayIdError() {},
    showInvalidDisplayIdError() {},
    showNetworkCheckError() {},
    disableContinue() {},
    launchViewer() {}
  }

  after(() => chrome.flush());

  afterEach(() => sandbox.restore());

  it('shows invalid display ID error', () => {
    const validator = ()=>Promise.reject(Error("Invalid display id"));

    sandbox.spy(viewModel, 'showInvalidDisplayIdError');

    const controller = screen.createController(viewModel, validator);

    return controller.validateDisplayId('invalid')
      .then(() => assert.fail('catch should have been called'))
      .catch(() => {
        assert.ok(viewModel.showInvalidDisplayIdError.calledOnce);
      });
  });

  it('shows empty display ID error', () => {
    sandbox.spy(viewModel, 'showEmptyDisplayIdError');
    const validator = ()=>Promise.resolve();

    const controller = screen.createController(viewModel, validator);

    return controller.validateDisplayId('')
      .then(() => assert.fail('catch should have been called'))
      .catch(() => {
        assert.ok(viewModel.showEmptyDisplayIdError.calledOnce);
      });
  });

  it('launches viewer when display ID is valid and network checks pass', () => {
    const validator = ()=>Promise.resolve();
    sandbox.spy(viewModel, 'launchViewer');
    sandbox.stub(networkChecks, 'getResult').resolves(true);
    sandbox.stub(networkChecks, 'haveCompleted').returns(true);

    const controller = screen.createController(viewModel, validator);

    return controller.validateDisplayId('valid')
      .then(() => {
        assert.ok(viewModel.launchViewer.calledOnce);
      });
  });

  it('does not launch viewer when display ID is valid and network checks fail', () => {
    const validator = ()=>Promise.resolve();
    sandbox.spy(viewModel, 'launchViewer');
    sandbox.stub(networkChecks, 'getResult').rejects(false);

    const controller = screen.createController(viewModel, validator);

    return controller.validateDisplayId('valid')
      .then(() => {
        assert.ok(!viewModel.launchViewer.calledOnce);
      });
  });
  it('stores uppercase display ID locally when it is valid', () => {
    const validator = ()=>Promise.resolve();
    const controller = screen.createController(viewModel, validator);

    return controller.validateDisplayId('valid')
      .then(() => {
        assert.ok(chrome.storage.local.set.calledWith({displayId: 'VALID'}));
      });
  });

  it('stores lowercase legacy display ID locally when it is valid', () => {
    const validator = ()=>Promise.resolve();
    const controller = screen.createController(viewModel, validator);

    const displayId = '0584CCCD-2AB1-42F1-A2EE-0FD22AB5098D';
    return controller.validateDisplayId(displayId)
      .then(() => {
        assert.ok(chrome.storage.local.set.calledWith({displayId: '0584cccd-2ab1-42f1-a2ee-0fd22ab5098d'}));
      });
  });

  it('removes cached content when display is valid', () => {
    const validator = ()=>Promise.resolve();
    const controller = screen.createController(viewModel, validator);

    const displayId = 'valid';
    return controller.validateDisplayId(displayId)
      .then(() => {
        assert.ok(chrome.storage.local.remove.calledWith('content'));
      });
  });

});

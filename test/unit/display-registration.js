/* eslint-disable func-style */
const assert = require('assert');
const sinon = require('sinon');
const chrome = require('sinon-chrome/apps');
const screen = require('../../src/display-registration');

const sandbox = sinon.createSandbox();

describe('Display ID Screen', () => {

  const viewModel = {
    bindRegistrationFunction() {},
    showEmptyDisplayIdError() {},
    showInvalidDisplayIdError() {},
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

  it('launches viewer when display ID is valid', () => {
    const validator = ()=>Promise.resolve();
    sandbox.spy(viewModel, 'launchViewer');

    const controller = screen.createController(viewModel, validator);

    return controller.validateDisplayId('valid')
      .then(() => {
        assert.ok(viewModel.launchViewer.calledOnce);
      });
  });

  it('stores display ID locally when it is valid', () => {
    const validator = ()=>Promise.resolve();
    const controller = screen.createController(viewModel, validator);

    return controller.validateDisplayId('valid')
      .then(() => {
        assert.ok(chrome.storage.local.set.calledWith({displayId: 'valid'}));
      });
  });

});

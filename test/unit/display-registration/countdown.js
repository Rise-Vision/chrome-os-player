/* eslint-disable func-style */
const assert = require('assert');
const sinon = require('sinon');
const chrome = require('sinon-chrome/apps');
const windowManager = require('../../../src/window-manager');
const networkChecks = require('../../../src/network-checks');

const screen = require('../../../src/display-registration/countdown');

const sandbox = sinon.createSandbox();

describe('Countdown Screen', () => {

  const viewModel = {
    bindController() {},
    updateSecondsRemaining() {},
    showNetworkError() {}
  }

  after(() => chrome.flush());

  afterEach(() => sandbox.restore());

  it('shows 10 second countdown', () => {
    sandbox.stub(windowManager, 'launchPlayer').resolves();
    sandbox.stub(networkChecks, 'getResult').resolves();
    sandbox.stub(networkChecks, 'haveCompleted').returns(true);
    sandbox.spy(viewModel, 'updateSecondsRemaining');
    const clock = sandbox.useFakeTimers();

    screen.createController(viewModel);

    clock.runAll();

    sinon.assert.callCount(viewModel.updateSecondsRemaining, 10);
    const firstCall = viewModel.updateSecondsRemaining.firstCall.args[0];
    assert.equal(firstCall, 9);
    const secondCall = viewModel.updateSecondsRemaining.secondCall.args[0];
    assert.equal(secondCall, 8);
    const thirdCall = viewModel.updateSecondsRemaining.thirdCall.args[0];
    assert.equal(thirdCall, 7);
    const lastCall = viewModel.updateSecondsRemaining.lastCall.args[0];
    assert.equal(lastCall, 0);
  });

  it('launches player after 10 second countdown', () => {
    sandbox.stub(windowManager, 'launchPlayer').resolves();
    sandbox.stub(networkChecks, 'getResult').resolves();
    sandbox.stub(networkChecks, 'haveCompleted').returns(true);
    sandbox.spy(viewModel, 'updateSecondsRemaining');
    sandbox.spy(viewModel, 'showNetworkError');
    const clock = sandbox.useFakeTimers();

    screen.createController(viewModel);

    return Promise.resolve(clock.runAll())
    .then(()=>{
      sinon.assert.notCalled(viewModel.showNetworkError);
      sinon.assert.called(windowManager.launchPlayer);
    });
  });

  it('launches player after showing network error ', () => {
    sandbox.stub(windowManager, 'launchPlayer').resolves();
    sandbox.stub(networkChecks, 'getResult').rejects();
    sandbox.stub(networkChecks, 'haveCompleted').returns(true);
    sandbox.spy(viewModel, 'updateSecondsRemaining');
    sandbox.spy(viewModel, 'showNetworkError');
    const clock = sandbox.useFakeTimers();

    screen.createController(viewModel);

    return Promise.resolve(clock.runAll())
    .then(()=>new Promise(res=>process.nextTick(()=>{clock.runAll(); res()})))
    .then(()=>{
      sinon.assert.called(viewModel.showNetworkError);
      sinon.assert.called(windowManager.launchPlayer);
    });
  });

  it('launches player on continue', () => {
    sandbox.stub(windowManager, 'launchPlayer').resolves();
    sandbox.stub(networkChecks, 'haveCompleted').returns(true);
    sandbox.stub(networkChecks, 'getResult').resolves();
    sandbox.useFakeTimers();

    const controller = screen.createController(viewModel);

    return controller.continue()
    .then(()=>sinon.assert.called(windowManager.launchPlayer));
  });

  it('closes current window on cancel', () => {
    sandbox.stub(windowManager, 'closeCurrentWindow');
    sandbox.useFakeTimers();

    const controller = screen.createController(viewModel);

    controller.cancel();

    sinon.assert.called(windowManager.closeCurrentWindow);
  });

});

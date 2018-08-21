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
    sandbox.stub(windowManager, 'launchViewer').resolves();
    sandbox.stub(networkChecks, 'getResult').resolves();
    sandbox.stub(networkChecks, 'haveCompleted').returns(true);
    sandbox.spy(viewModel, 'updateSecondsRemaining');
    const clock = sandbox.useFakeTimers();

    const displayId = 'displayId';
    screen.createController(viewModel, displayId);

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

  it('launches viewer after 10 second countdown', () => {
    sandbox.stub(windowManager, 'launchViewer').resolves();
    sandbox.stub(networkChecks, 'getResult').resolves();
    sandbox.stub(networkChecks, 'haveCompleted').returns(true);
    sandbox.spy(viewModel, 'updateSecondsRemaining');
    sandbox.spy(viewModel, 'showNetworkError');
    const clock = sandbox.useFakeTimers();

    const displayId = 'displayId';
    screen.createController(viewModel, displayId);

    return Promise.resolve(clock.runAll())
    .then(()=>new Promise(res=>process.nextTick(()=>{clock.runAll(); res()})))
    .then(()=>{
      sinon.assert.notCalled(viewModel.showNetworkError);
      sinon.assert.calledWith(windowManager.launchViewer, displayId);
    });
  });

  it('launches viewer after showing network error ', () => {
    sandbox.stub(windowManager, 'launchViewer').resolves();
    sandbox.stub(networkChecks, 'getResult').rejects();
    sandbox.stub(networkChecks, 'haveCompleted').returns(true);
    sandbox.spy(viewModel, 'updateSecondsRemaining');
    sandbox.spy(viewModel, 'showNetworkError');
    const clock = sandbox.useFakeTimers();

    const displayId = 'displayId';
    screen.createController(viewModel, displayId);

    return Promise.resolve(clock.runAll())
    .then(()=>new Promise(res=>process.nextTick(()=>{clock.runAll(); res()})))
    .then(()=>{
      sinon.assert.called(viewModel.showNetworkError);
      sinon.assert.calledWith(windowManager.launchViewer, displayId);
    });
  });

  it('launches viewer on continue', () => {
    sandbox.stub(windowManager, 'launchViewer').resolves();
    sandbox.stub(networkChecks, 'haveCompleted').returns(true);
    sandbox.stub(networkChecks, 'getResult').resolves();
    sandbox.useFakeTimers();

    const displayId = 'displayId';
    const controller = screen.createController(viewModel, displayId);

    return controller.continue()
    .then(()=>sinon.assert.called(windowManager.launchViewer));
  });

  it('closes current window on cancel', () => {
    sandbox.stub(windowManager, 'closeCurrentWindow');
    sandbox.useFakeTimers();

    const displayId = 'displayId';
    const controller = screen.createController(viewModel, displayId);

    controller.cancel();

    sinon.assert.called(windowManager.closeCurrentWindow);
  });

});

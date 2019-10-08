/* eslint-disable func-style, no-magic-numbers */
const assert = require('assert');
const sinon = require('sinon');

const networkChecks = require('../../../src/network-checks');
const logger = require('../../../src/logging/logger');

const sandbox = sinon.createSandbox();
const fetch = sandbox.stub();

describe('Network Checks', ()=>{

  before(() => {
    global.fetch = fetch;
  });

  after(() => Reflect.deleteProperty(global, 'fetch'));

  beforeEach(() => fetch.resetBehavior());

  beforeEach(() => {
    sandbox.stub(logger, 'log');
    sandbox.stub(logger, 'error');
    sandbox.stub(global, "setTimeout");
  });

  afterEach(() => sandbox.restore());

  it('wait for viewer resolves when fetch works', ()=>{

    fetch.resolves({ok: true});

    return networkChecks.waitForViewer().then(() => {
      assert.equal(logger.error.notCalled, true);
    })
  });

  it('wait for viewer resolves when fetch works after delay', ()=>{
    setTimeout.yields();
    fetch.onFirstCall().resolves({ok: false})
      .onSecondCall().resolves({ok: false})
      .onThirdCall().resolves({ok: true});

    return networkChecks.waitForViewer().then(() => {
      assert.equal(setTimeout.firstCall.args[1], 1000);
      assert.equal(logger.error.callCount, 1);
    })
  });

});

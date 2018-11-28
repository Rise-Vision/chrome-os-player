const assert = require("assert");
const sinon = require('sinon');

const viewerMessaging = require('../../../src/messaging/viewer-messaging');

const rendererHealth = require('../../../src/uptime/renderer-health');

const sandbox = sinon.createSandbox();

describe("Renderer Health", () => {

  afterEach(() => sandbox.restore());

  it('should resolve with true when renderer responds', () => {
    sandbox.stub(viewerMessaging, 'once').yields();

    rendererHealth.check().then(result => {
      assert.equal(result, true);
    });
  });

  it('should resolve with false when renderer does not respond', () => {
    sandbox.stub(viewerMessaging, 'once');

    rendererHealth.check().then(result => {
      assert.equal(result, false);
    });
  });

  it('should call listener when renderer fails 3 times', () => {
    sandbox.stub(viewerMessaging, 'once');

    const listener = sandbox.mock();
    rendererHealth.onMultipleFailures(listener);

    const promises = [rendererHealth.check(), rendererHealth.check(), rendererHealth.check()];
    Promise.all(promises).then(() => {
      sinon.assert.calledOnce(listener);
    });
  });

  it('should not call listener when renderer fails 2 times', () => {
    sandbox.stub(viewerMessaging, 'once');

    const listener = sandbox.mock();
    rendererHealth.onMultipleFailures(listener);

    const promises = [rendererHealth.check(), rendererHealth.check()];
    Promise.all(promises).then(() => {
      sinon.assert.notCalled(listener);
    });
  });
});

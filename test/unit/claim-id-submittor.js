const assert = require('assert');
const sinon = require('sinon');
const submittor = require('../../src/claim-id-submittor');
const fetch = sinon.stub();

describe('Claim ID Submittor', () => {

  before(() => global.fetch = fetch);

  after(() => Reflect.deleteProperty(global, 'fetch'));

  beforeEach(() => fetch.resetBehavior());

  it('submits a claim id', () => {
    fetch.resolves({
      json() {
        return Promise.resolve({
          status: {code: 0},
          displayId: "test-result-id"
        });
      }
    });

    return submittor('test-claim-id', 'test-display-name')
      .then((resp)=>{
        assert.equal(resp, 'test-result-id');
      });
  });

  it('rejects when missing display name', () => {
    return submittor('test-claim-id')
      .then(() => assert.fail('catch should have been called'))
      .catch((err) => {
        assert.equal(err.message, "Missing display name");
      });
  });

  it('rejects server error is returned', () => {
    fetch.resolves({
      json() {
        return {
          status: {
            code: 500,
            message: 'test-server-error'
          }
        };
      }
    });

    return submittor('test-claim-id', 'test-display-name')
    .then(() => assert.fail('catch should have been called'))
    .catch((err) => {
      assert.equal(err.message, 'test-server-error');
    });
  });

  it('rejects on fetch error', () => {
    fetch.rejects(Error());

    return submittor('test-claim-id', 'test-display-name')
    .then(() => assert.fail('catch should have been called'))
    .catch((err) => {
        assert.ok(err);
    });
  });
});

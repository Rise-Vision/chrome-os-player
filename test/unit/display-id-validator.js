const assert = require('assert');
const sinon = require('sinon');
const validator = require('../../src/display-id-validator');
const fetch = sinon.stub();

describe('Display ID Validator', () => {

  before(() => global.fetch = fetch);

  after(() => Reflect.deleteProperty(global, 'fetch'));

  beforeEach(() => fetch.resetBehavior());

  it('validates a display id', () => {
    fetch.resolves({
      json() {
        return Promise.resolve({
          item: {
            companyId: 'A'
          }
        });
      }
    });

    return validator('--XXX--AKQ2K8D9D9VE')
      .then((resp)=>{
        assert.equal(resp.item.companyId, 'A');
      });
  });

  it('rejects when validation fetch fails', () => {
    fetch.rejects(Error());

    return validator('--XXX--AKQ2K8D9D9VE')
      .then(() => assert.fail('catch should have been called'))
      .catch((err) => {
        assert.ok(err);
      });
  });

  it('rejects when not validated', () => {
    fetch.resolves({
      json() {
        return {
          error: {
            code: 500,
            message: 'test failure'
          }
        };
      }
    });

    return validator('--XXX--AKQ2K8D9D9VE')
    .then(() => assert.fail('catch should have been called'))
    .catch((err) => {
        assert.equal(err.message, 'test failure');
      });
  });

  it('rejects when display has been deleted', () => {
    fetch.resolves({
      json() {
        return {
          size: '2'
        };
      }
    });

    return validator('--XXX--AKQ2K8D9D9VE')
      .then(() => assert.fail('catch should have been called'))
      .catch((err) => {
        assert.equal(err.message, 'Display has been deleted');
      });
  });

});

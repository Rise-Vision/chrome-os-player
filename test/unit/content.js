const assert = require('assert');
const sinon = require('sinon');
const systemInfo = require('../../src/logging/system-info');
const scheduleParser = require("../../src/scheduling/schedule-parser");
let content = null;

const sandbox = sinon.createSandbox();

global.document = {addEventListener() {return null}};

describe('Content', () => {

  afterEach(() => sandbox.restore());

  beforeEach(() => {
    sandbox.stub(systemInfo, 'getPlayerVersion').returns('0.0.0.0');
    sandbox.stub(systemInfo, 'isBeta').returns(false);
    content = require('../../src/content'); // eslint-disable-line global-require
  });

  it('should load Viewer over HTTPS when schedule has tempalte only', () => {
    sandbox.stub(scheduleParser, 'hasOnlyHtmlTemplates').returns(true);

    const viewerUrl = content._getViewerUrlForSchedule();
    assert.equal(viewerUrl, "https://viewer.risevision.com/Viewer.html");
  });

  it('should load Viewer over HTTP when includes non temaplte items', () => {
    sandbox.stub(scheduleParser, 'hasOnlyHtmlTemplates').returns(false);

    const viewerUrl = content._getViewerUrlForSchedule();
    assert.equal(viewerUrl, "http://viewer.risevision.com/Viewer.html");
  });

  it('should return true if http protocol of the currently running viewer matches protocol of the new schedule', () => {
    global.document.querySelector = () => {return {src: 'https://viewer.risevision.com/Viewer.html'}};
    sandbox.stub(scheduleParser, 'hasOnlyHtmlTemplates').returns(true);

    assert.equal(content._viewerHttpProtocolMatches(), true);
  });

  it('should return false if http protocol of the currently running viewer does not match protocol of the new schedule', () => {
    global.document.querySelector = () => {return {src: 'http://viewer.risevision.com/Viewer.html'}};
    sandbox.stub(scheduleParser, 'hasOnlyHtmlTemplates').returns(true);

    assert.equal(content._viewerHttpProtocolMatches(), false);
  });

});

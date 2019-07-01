const sinon = require("sinon");

const viewerMessaging = require("../../../src/messaging/viewer-messaging");

const contentUptime = require("../../../src/uptime/content-uptime");
const uptime = require("../../../src/uptime/uptime");
const logger = require("../../../src/logging/logger");

const sandbox = sinon.createSandbox();


describe("Content Uptime", () => {
  let clock = null;
  let validPlayingItem = null;

  beforeEach(() => {
    clock = sandbox.useFakeTimers();
    sandbox.stub(viewerMessaging, "on");
    sandbox.stub(viewerMessaging, "send");
    sandbox.stub(uptime, "isActive").returns(true);
    sandbox.stub(logger, "log");
    sandbox.stub(logger, "logTemplateUptime");
    sandbox.stub(logger, "logComponentUptime");

    validPlayingItem = {presentationId: "PID", presentationType: "HTML Template", productCode: "PC", version: "v1"};
    contentUptime.handlePlayingItem(validPlayingItem);
  })

  afterEach(() => sandbox.restore());

  describe("init", () => {
    it("listens for uptime and playing item messages", () => {
      contentUptime.init();
      sinon.assert.calledWith(viewerMessaging.on, "content-uptime-result");
      sinon.assert.calledWith(viewerMessaging.on, "playing-item");
    });

    it("requests uptime periodically", () => {
      contentUptime.init();
      sinon.assert.notCalled(viewerMessaging.send);

      clock.tick(300000);
      sinon.assert.calledWith(viewerMessaging.send, {topic: "content-uptime", forPresentationId: validPlayingItem.presentationId});

      clock.tick(300000);
      sinon.assert.calledTwice(viewerMessaging.send);
      sinon.assert.alwaysCalledWith(viewerMessaging.send, {topic: "content-uptime", forPresentationId: validPlayingItem.presentationId});
    });
  });

  it("doesn't retrive uptime if item is not HTML Template", ()=>{
    validPlayingItem.presentationType = "Presentation";

    contentUptime.handlePlayingItem(validPlayingItem);
    contentUptime.init();
    clock.tick(300000);
    sinon.assert.notCalled(viewerMessaging.send);
  });

  it("doesn't retrive uptime if inactive", ()=>{
    uptime.isActive.returns(false);

    contentUptime.init();
    clock.tick(300000);
    sinon.assert.notCalled(viewerMessaging.send);
  });

  it("handles no response", ()=>{
    contentUptime.init();
    clock.tick(306000);
    sinon.assert.calledWith(logger.log, "uptime - no response");

    sinon.assert.calledWith(logger.logTemplateUptime, {
      presentation_id: validPlayingItem.presentationId,
      template_product_code: validPlayingItem.productCode,
      template_version: validPlayingItem.version,
      responding: false
    });
  });

  it("handles uptime response", ()=>{
    contentUptime.init();
    clock.tick(300000);

    viewerMessaging.on.getCall(0).callback({
      template: {
        presentation_id: validPlayingItem.presentationId,
        template_product_code: validPlayingItem.productCode,
        template_version: validPlayingItem.version
      },
      components: []
    });

    sinon.assert.calledWith(logger.log, "uptime - result");
    sinon.assert.calledWith(logger.logTemplateUptime, {
      presentation_id: validPlayingItem.presentationId,
      template_product_code: validPlayingItem.productCode,
      template_version: validPlayingItem.version,
      responding: true
    });
    sinon.assert.notCalled(logger.logComponentUptime);
  });

  it("handles uptime response with component data", ()=>{
    const componentResult = {
      presentation_id: validPlayingItem.presentationId,
      template_product_code: validPlayingItem.productCode,
      template_version: validPlayingItem.version,
      componentType: 'componentType',
      componentId: 'componentId',
      responding: true,
      error: false
    };
    contentUptime.init();
    clock.tick(300000);

    viewerMessaging.on.getCall(0).callback({
      template: {
        presentation_id: validPlayingItem.presentationId,
        template_product_code: validPlayingItem.productCode,
        template_version: validPlayingItem.version
      },
      components: [componentResult]
    });

    sinon.assert.calledWith(logger.log, "uptime - result");
    sinon.assert.calledWith(logger.logTemplateUptime, {
      presentation_id: validPlayingItem.presentationId,
      template_product_code: validPlayingItem.productCode,
      template_version: validPlayingItem.version,
      responding: true
    });
    sinon.assert.calledWith(logger.logComponentUptime, componentResult);
  });


  it("ignores responses from non-expected templates", ()=>{
    contentUptime.init();
    clock.tick(300000);

    viewerMessaging.on.getCall(0).callback({
      template: {
        presentation_id: 'otherPresentationID',
        template_product_code: validPlayingItem.productCode,
        template_version: validPlayingItem.version
      },
      components: []
    });

    sinon.assert.calledWith(logger.log, "uptime - result");
    sinon.assert.notCalled(logger.logTemplateUptime);
  });


  it("ignores responses outside of expected time", ()=>{
    contentUptime.init();
    clock.tick(307000);
    // logTemplateUptime() will be called once for a no-response, but should not be called afterwards
    logger.logTemplateUptime.resetHistory();

    viewerMessaging.on.getCall(0).callback({
      template: {
        presentation_id: validPlayingItem.presentationId,
        template_product_code: validPlayingItem.productCode,
        template_version: validPlayingItem.version
      },
      components: []
    });

    sinon.assert.calledWith(logger.log, "uptime - result");
    sinon.assert.notCalled(logger.logTemplateUptime);
    sinon.assert.notCalled(logger.logComponentUptime);
  });

});

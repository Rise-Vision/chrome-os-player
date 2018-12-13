/* eslint-disable no-magic-numbers */
const sinon = require('sinon');
const logger = require('../../src/logging/logger');
const envVars = require(`../../src/launch-environment`);
const rebootScheduler = require('../../src/reboot-scheduler');
const sandbox = sinon.createSandbox();

describe('Reboot Scheduler', () => {

  afterEach(() => {
    sandbox.restore();
    chrome.flush();
  });

  beforeEach(() => sandbox.stub(logger, 'log'));

  it('should not schedule reboot when content is empty', () => {
    sandbox.stub(envVars, 'isKioskSession').returns(true);
    rebootScheduler.scheduleReboot();

    sinon.assert.notCalled(chrome.alarms.create);
  });

  it('should not schedule reboot when display is empty', () => {
    sandbox.stub(envVars, 'isKioskSession').returns(true);
    const content = {};

    rebootScheduler.scheduleReboot(content);

    sinon.assert.notCalled(chrome.alarms.create);
  });

  it('should not schedule reboot when restart is not enable', () => {
    sandbox.stub(envVars, 'isKioskSession').returns(true);
    const content = {display: {restartEnabled: false}};

    rebootScheduler.scheduleReboot(content);

    sinon.assert.notCalled(chrome.alarms.create);
  });

  it('should not schedule reboot when not in kiosk mode', () => {
    sandbox.stub(envVars, 'isKioskSession').returns(false);
    const content = {display: {restartEnabled: false, restartTime: 'tomorrow'}};

    rebootScheduler.scheduleReboot(content);

    sinon.assert.notCalled(chrome.alarms.create);
  });

  it('should not schedule reboot and log error when restart time is not valid', () => {
    sandbox.stub(envVars, 'isKioskSession').returns(true);

    const content = {display: {restartEnabled: true, restartTime: 'tomorrow'}};

    rebootScheduler.scheduleReboot(content);

    sinon.assert.notCalled(chrome.alarms.create);
    sinon.assert.calledWith(logger.log, 'scheduled reboot error', 'invalid reboot schedule time: tomorrow')
  });

  it('should schedule reboot successfully', () => {
    sandbox.stub(envVars, 'isKioskSession').returns(true);
    const nowDate = Date.now();
    const oneHour = 60 * 60 * 1000;
    const restartDate = new Date(nowDate + oneHour);
    const hh = `${restartDate.getHours()}`.padStart(2, '0');
    const mm = `${restartDate.getMinutes()}`.padStart(2, '0');
    const content = {display: {restartEnabled: true, restartTime: `${hh}:${mm}`}};

    rebootScheduler.scheduleReboot(content, nowDate);

    chrome.alarms.onAlarm.dispatch({name: 'restart'});

    sinon.assert.calledWith(chrome.alarms.create, 'restart');
    sinon.assert.called(chrome.runtime.restart);
  });

  it('should reload and not reboot now when not in kiosk mode', () => {
    sandbox.stub(envVars, 'isKioskSession').returns(false);

    rebootScheduler.rebootNow();

    sinon.assert.notCalled(chrome.runtime.restart);
    sinon.assert.called(chrome.runtime.reload);
  });

  it('should reboot now successfully', () => {
    sandbox.stub(envVars, 'isKioskSession').returns(true);

    rebootScheduler.rebootNow();

    sinon.assert.called(chrome.runtime.restart);
  });

  it('should restart successfully', () => {
    sandbox.stub(envVars, 'isKioskSession').returns(true);

    rebootScheduler.restart();

    sinon.assert.called(chrome.runtime.reload);
  });

});

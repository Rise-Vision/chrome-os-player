const launchEnvs = require("./launch-environment");
const logger = require('./logging/logger');

function shouldSchedule(content) {
  if (!(content && content.display && content.display.restartEnabled)) {
    logger.log('reboot not enabled in display settings');
    return false;
  }

  if (!(content.display.restartTime && content.display.restartTime.includes(':'))) {
    logger.log('scheduled reboot error', `invalid reboot schedule time: ${content.display.restartTime}`);
    return false;
  }

  return true;
}

function scheduleReboot(content, nowDate = Date.now()) {
  if (!shouldSchedule(content)) {return;}

  const rebootDate = parseRebootDate(content.display.restartTime, nowDate);
  logger.log('scheduling reboot', rebootDate.toString());
  chrome.alarms.create('restart', {when: rebootDate.getTime()});
  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'restart') {
      rebootNow();
    }
  });
}

function parseRebootDate(restartHHMM, nowDate) {
  const rebootDate = new Date();
  rebootDate.setHours(parseInt(restartHHMM.split(":")[0], 10));
  rebootDate.setMinutes(parseInt(restartHHMM.split(":")[1], 10));
  if (rebootDate < nowDate) {rebootDate.setDate(rebootDate.getDate() + 1);}
  return rebootDate;
}

function rebootNow(forceReboot = true) {
  if (forceReboot && launchEnvs.isKioskSession()) {
    logger.log('rebooting');
    chrome.runtime.restart();
  } else {
    logger.log('restarting');
    chrome.runtime.reload();
  }
}

function restart() {
  rebootNow(false);
}

module.exports = {
  scheduleReboot,
  rebootNow,
  restart
}

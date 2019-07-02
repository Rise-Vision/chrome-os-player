const isEqual = require('lodash.isequal');
const bq = require('./bq-retry');
const systemInfo = require('./system-info');
const environment = require('../launch-environment');
const moment = require('moment-timezone');

function buildPlayerData(viewerConfig, isAuthorized) {
  return Promise.all([systemInfo.getMachineId(), systemInfo.getDisplayId(), systemInfo.getOS(), systemInfo.getIpAddress(), systemInfo.getAppId()])
    .then(values => {
      const [machineId, displayId, os, ip, appid] = values;
      const chromeOSVersion = systemInfo.getChromeOSVersion();
      return {
        machine_id: machineId,
        display_id: displayId,
        os_description: chromeOSVersion ? `Chrome OS ${chromeOSVersion}` : os,
        player_name: systemInfo.getPlayerName(),
        player_version: systemInfo.getPlayerVersion({includeBetaPrefix: false}),
        browser_name: 'Chrome',
        browser_version: systemInfo.getChromeVersion(),
        local_ip: ip,
        viewer_version: viewerConfig.viewerVersion,
        width: viewerConfig.width,
        height: viewerConfig.height,
        time_zone: moment.tz.guess(),
        utc_offset: moment().format("Z"),
        offline_subscription: isAuthorized,
        app_id: appid
      };
    });
}

function readPlayerData() {
  return new Promise((resolve) => {
    chrome.storage.local.get((items) => resolve(items.playerData))
  });
}

function logClientInfo(viewerConfig, isAuthorized, nowDate = new Date()) {
  if (environment.isDevelopmentVersion()) {return Promise.resolve();}

  return Promise.all([buildPlayerData(viewerConfig, isAuthorized), readPlayerData()])
    .then((values) => {
      const [newData, savedData] = values;
      if (isEqual(newData, savedData)) {
        return savedData;
      }

      const data = Object.assign({ts: nowDate.toISOString()}, newData);
      return bq.insert(data, 'Player_Data', 'configuration', nowDate)
          .then(() => chrome.storage.local.set({playerData: newData}));
    })
    .catch(err => error('error when logging client info', err));
}

function logUptime(connected, showing, scheduled, nowDate = new Date()) {
  if (environment.isDevelopmentVersion()) {return Promise.resolve();}

  return systemInfo.getId()
    .then(id => {
      const data = {
        display_id: id,
        showing,
        connected,
        scheduled,
        ts: nowDate.toISOString()
      };
      return bq.insert(data, 'Uptime_Events', 'events', nowDate);
    })
    .catch(err => error('error when logging uptime', err));
}

function logTemplateUptime(result, nowDate = new Date()) {
  console.log('template uptime', result, nowDate);
  if (environment.isDevelopmentVersion()) {return Promise.resolve();}

  return systemInfo.getId()
    .then(id => {
      result.display_id = id;
      result.ts = nowDate.toISOString();
      return bq.insert(result, 'Template_Uptime_Events', 'events', nowDate);
    })
    .catch(err => error('error when logging Template uptime', err));
}

function logComponentUptime(result, nowDate = new Date()) {
  console.log('component uptime', result, nowDate);
  if (environment.isDevelopmentVersion()) {return Promise.resolve();}

  return systemInfo.getId()
    .then(id => {
      result.display_id = id;
      result.ts = nowDate.toISOString();
      return bq.insert(result, 'Component_Uptime_Events', 'events', nowDate);
    })
    .catch(err => error('error when logging Component uptime', err));
}

/**
 * @param {string} event
 * @param {object} [details]
 * @param {Date} [nowDate]
 * @returns {Promise}
 */
function log(event, details, nowDate = new Date()) {
  console.log(event, details);

  if (environment.isDevelopmentVersion()) {return Promise.resolve();}

  return Promise.all([systemInfo.getId(), systemInfo.getOS(), systemInfo.getIpAddress()])
    .then(values => {
      const [id, os, ip] = values;
      const data = {
        event,
        id,
        os,
        ip,
        player_version: systemInfo.getPlayerVersion(),
        event_details: JSON.stringify(details),
        chrome_version: systemInfo.getChromeVersion(),
        ts: nowDate.toISOString()
      };
      return bq.insert(data, 'ChromeOS_Player_Events', 'events', nowDate);
    })
    .catch(console.error);
}

/**
 * @param {string} event
 * @param {Error} [err]
 * @param {Date} [nowDate]
 * @returns {Promise}
 */
function error(event, err, details = {}, nowDate = new Date()) {
  console.error(event, err);

  if (err) {
    details.message = err.message;
    details.stack = err.stack;
  }
  return log(event, details, nowDate);
}

module.exports = {
  log,
  logClientInfo,
  logUptime,
  logTemplateUptime,
  logComponentUptime,
  error
}

const viewerInjector = require('./viewer-injector');
const viewerMessaging = require('./messaging/viewer-messaging');
const contentLoader = require('./content-loader');
const logger = require('./logging/logger');
const messaging = require('./messaging/messaging-service-client');
const storage = require('./storage/storage');
const licensing = require('./licensing');
const debugDataRequest = require('./messaging/debug-data-request');
const rebootScheduler = require('./reboot-scheduler');
const orientation = require('./orientation');
const fileServer = require('./storage/file-server');
const launchEnv = require('./launch-environment');
const screenshot = require('./screenshot');
const uptime = require('./uptime/uptime');
const uptimeRendererHealth = require('./uptime/renderer-health');
const scheduleParser = require('./scheduling/schedule-parser');
const noViewerSchedulePlayer = require('./scheduling/schedule-player');
const contentWatchdog = require('./content-watchdog');
const whiteScreenAnalyser = require('./white-screen-analyser');

const VIEWER_URL = "http://viewer.risevision.com/Viewer.html";

function setUpMessaging() {
  const webview = document.querySelector('webview');
  viewerMessaging.init(webview);

  webview.addEventListener('loadcommit', (evt) => {
    if (!evt.isTopLevel) {return;}
    webview.executeScript({code: viewerInjector.generateMessagingSetupFunction(), runAt: 'document_start'}, ()=>{
      logger.log('viewer webview injection suceeded');
      viewerMessaging.send({from: 'player', topic: 'latch-app-window'});
    });
  });

  setUpWebviewEvents(webview);

  messaging.on('content-update', fetchContent);
  messaging.on('reboot-request', () => rebootScheduler.rebootNow());
  messaging.on('restart-request', () => rebootScheduler.restart());
  messaging.on('screenshot-request', (request) => screenshot.handleRequest(webview, request));

  return messaging.init()
  .catch(() => logger.log('MS connection failed on init'));
}

function setUpWebviewEvents(webview) {
  setUpResponsivenessEvents(webview);
  setUpContentLoadEvents(webview);

  webview.addEventListener('permissionrequest', evt => {
    logger.log('viewer webview premission requested', evt.permission);
    if (evt.permission === 'geolocation' || evt.permission === 'loadplugin') {
      evt.request.allow();
    } else {
      evt.request.deny();
    }
  });
}

function setUpResponsivenessEvents(webview) {
  let responsiveTimer = null;
  const sixMinutes = 6 * 60 * 1000; // eslint-disable-line

  webview.addEventListener('unresponsive', () => {
    logger.error('player - viewer webview unresponsive');
    responsiveTimer = setTimeout(() => rebootScheduler.rebootNow(), sixMinutes);
  });

  webview.addEventListener('responsive', () => clearTimeout(responsiveTimer));

  uptimeRendererHealth.onMultipleFailures(() => {
    logger.log('player - multiple renderer failures');
    rebootScheduler.rebootNow();
  });
}

function setUpContentLoadEvents(webview) {
  const timeout = 60 * 1000; // eslint-disable-line no-magic-numbers
  let tries = 1;
  let timer = null;
  webview.addEventListener('loadabort', evt => {
    logger.error('player - viewer webview load aborted', null, {code: evt.code, reason: evt.reason});
    clearTimeout(timer);
    tries += 1;
    timer = setTimeout(() => webview.reload(), tries * timeout);
  });
  webview.addEventListener('contentload', () => {
    clearTimeout(timer);
    logger.log(`player - webview content loaded`, {url: webview.src});
  });
}

function setUpClientInfoLog() {
  viewerMessaging.removeAllListeners('viewer-config');
  viewerMessaging.on('viewer-config', viewerConfig => {
    logger.log('viewer config received', viewerConfig);
    licensing.onAuthorizationStatus(isAuthorized => {
      logger.log('authorization status received', isAuthorized);
      logger.logClientInfo(viewerConfig, isAuthorized);
    });
  });
}

function setUpClientInfoLogNoViewer() {
  licensing.onAuthorizationStatus(isAuthorized => {
    logger.log('authorization status received', isAuthorized);
    logger.logClientInfo({width: window.innerWidth, height: window.innerHeight}, isAuthorized);
  });
}

function fetchContent() {
  return contentLoader.loadContent()
  .then(contentData => {
    rebootScheduler.scheduleReboot(contentData);
    orientation.setupOrientation(contentData);
    uptime.setSchedule(contentData);
    scheduleParser.setContent(contentData);
    whiteScreenAnalyser.setContent(contentData);
    return contentData;
  })
  .then(contentData => loadContent(contentData))
  .catch((error) => {
    logger.error('player - error when fetching content', error);
    rebootScheduler.rebootNow();
  });
}

function loadViewerUrl() {
  viewerMessaging.reset();
  noViewerSchedulePlayer.stop();

  chrome.storage.local.get('displayId', ({displayId}) => {
    const url = `${VIEWER_URL}?player=true&type=display&id=${displayId}`;
    loadUrl(url);
  });
}

function loadUrl(url) {
  const webview = document.querySelector('webview');
  webview.src = url;
  viewerMessaging.configure(webview);
}

function isViewerLoaded() {
  const webview = document.querySelector('webview');
  const loadedUrl = webview.src;
  return loadedUrl && loadedUrl.indexOf(VIEWER_URL) >= 0;
}

function loadContent(contentData) {
  if (scheduleParser.hasOnlyNoViewerURLItems()) {
    setUpClientInfoLogNoViewer();
    return Promise.resolve(noViewerSchedulePlayer.start());
  }

  if (!isViewerLoaded()) {
    setUpClientInfoLog();
    loadViewerUrl();
  }

  return viewerMessaging.viewerCanReceiveContent()
  .then(() => {
    logger.log('sending content to viewer', contentData);
    viewerMessaging.send({from: 'player', topic: 'content-update', newContent: contentData});
  });
}

function init() {
  noViewerSchedulePlayer.setPlayUrlHandler(loadUrl);
  noViewerSchedulePlayer.listenForNothingPlaying(() => loadUrl(chrome.runtime.getURL('black-screen.html')));

  launchEnv.init()
  .then(() => {
    setUpMessaging()
      .then(storage.init)
      .then(licensing.init)
      .then(debugDataRequest.init)
      .catch(error => logger.error('player - error when initilizing modules', error));
    fileServer.init();
    uptime.init();
    fetchContent();
  });

  const webview = document.querySelector('webview');
  contentWatchdog.init(webview);
}

document.addEventListener('DOMContentLoaded', init);

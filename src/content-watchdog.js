const pixelmatch = require('pixelmatch');
const util = require('./util');
const logger = require('./logging/logger');

const MINUTES = 60000;
const whiteScreenCheckInterval = 5 * MINUTES; // eslint-disable-line no-magic-numbers
const repeatedWhiteScreenCheckInterval = whiteScreenCheckInterval / 5; // eslint-disable-line no-magic-numbers

const MAX_CONSECUTIVE_EVENTS = 3;
let repeatedWhiteScreenTimer = null;
let whiteScreenEvents = 0;

let webview = null;

module.exports = {
  init(webviewRef, schedule = setInterval) {
    webview = webviewRef;
    schedule(checkWhiteScreen, whiteScreenCheckInterval);
  }
};

function checkWhiteScreen() {
  webview.captureVisibleRegion({format: 'png'}, (dataUrl) => {
    util.dataUrlToImageData(dataUrl).then((image) => {
      const white = new Uint8Array(image.data.length)
      for (let i = 0; i < image.byteLength; i++) { // eslint-disable-line
        white[i] = 255;
      }

      const diff = pixelmatch(image.data, white, null, image.width, image.height);
      const whiteScreenDetected = diff <= 0;
      handleWhiteScreen(whiteScreenDetected);
    });
  });
}

function handleWhiteScreen(whiteScreenDetected, schedule = setTimeout, interval = repeatedWhiteScreenCheckInterval) {
  if (!whiteScreenDetected) {
    clearTimeout(repeatedWhiteScreenTimer);
    return;
  }

  whiteScreenEvents += 1;
  if (whiteScreenEvents >= MAX_CONSECUTIVE_EVENTS) {
    whiteScreenEvents = 0;
    logger.log("white screen detected");
    clearTimeout(repeatedWhiteScreenTimer);
  } else {
    repeatedWhiteScreenTimer = schedule(checkWhiteScreen, interval);
  }
}


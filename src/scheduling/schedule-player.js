/* eslint-disable max-statements */
const logger = require("../logging/logger");
const scheduleParser = require("./schedule-parser");
const playUntilDoneTracker = require("./play-until-done-tracker");

const nothingPlayingListeners = [];
const playingItemListeners = [];
const timers = {
  scheduleCheck: null,
  itemDuration: null
};

let playUrlHandler = () => {}; // eslint-disable-line func-style
let playableItems = [];
let playingItem = null;

module.exports = {
  start() {
    logger.log("no-viewer mode");
    clearTimeout(timers.scheduleCheck);
    playingItem = null;

    if (!scheduleParser.validateContent()) {
      logWithScheduleData("invalid schedule data");

      return nothingPlaying();
    }

    const now = module.exports.now();
    considerFutureScheduledItems(now);
    playCurrentlyPlayableItems(now);
  },
  setPlayUrlHandler(fn) {playUrlHandler = fn;},
  listenForNothingPlaying(listener) {nothingPlayingListeners.push(listener);},
  listenForPlayingItem(listener) {playingItemListeners.push(listener);},
  stop() {
    Object.values(timers).forEach(clearTimeout);
    playingItem = null;
    notifyPlayingItem();
  },
  now() {return new Date();}
};

function considerFutureScheduledItems(now) {
  if (scheduleParser.entireScheduleIs24x7()) {return;}

  const nextCheckMillis = Math.min(
    scheduleParser.millisUntilNextScheduledTime(now),
    millisUntilTomorrow(now)
  );

  timers.scheduleCheck = setTimeout(module.exports.start, nextCheckMillis);
}

function playCurrentlyPlayableItems(now) {
  const adjustForwardForTimerAccuracy = new Date(now.getTime() + 2000); // eslint-disable-line no-magic-numbers
  playableItems = scheduleParser.getCurrentPlayableItems(adjustForwardForTimerAccuracy);

  if (playableItems.length === 0) {
    logWithScheduleData("no playable items");
    return nothingPlaying();
  }

  if (playingItemIsStillPlayable()) {
    return shiftToNextItem();
  }

  playItems();
}

function playItems() {
  clearTimeout(timers.itemDuration);

  if (playingItem && playingItem.playUntilDone && !playUntilDoneTracker.isDone()) {
    timers.itemDuration = setTimeout(playItems, 1000); // eslint-disable-line no-magic-numbers
    return;
  }

  const nextItem = playableItems.shift();
  playableItems.push(nextItem);

  const previousItem = playingItem;
  playingItem = nextItem;
  notifyPlayingItem();

  if (!previousItem || previousItem.objectReference !== nextItem.objectReference) {
    playUntilDoneTracker.reset();
    playUrl(nextItem.objectReference);
  }

  timers.itemDuration = setTimeout(playItems, nextItem.playUntilDone ? 1000 : nextItem.duration * 1000); // eslint-disable-line no-magic-numbers
}

function playUrl(url) {playUrlHandler(url);}

function playingItemIsStillPlayable() {
  if (playingItem === null || timers.itemDuration === null) {return false;}

  return playableItems.some(item=>{
    return item.name === playingItem.name &&
      item.objectReference === playingItem.objectReference;
  });
}

function shiftToNextItem() {
  if (playingItem === null) {return;}

  do {
    playableItems.push(playableItems.shift());
  } while (playableItems[0].name !== playingItem.name ||
    playableItems[0].objectReference !== playingItem.objectReference);

  playableItems.push(playableItems.shift());
}

function millisUntilTomorrow(now) {
  const acceptablePrecisionSecondsIntoNextDay = 5;

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0);
  tomorrow.setMinutes(0);
  tomorrow.setSeconds(acceptablePrecisionSecondsIntoNextDay);

  return tomorrow - now;
}

function nothingPlaying() {
  clearTimeout(timers.itemDuration);
  playingItem = null;
  notifyPlayingItem();
  nothingPlayingListeners.forEach(listener=>listener());
}

function logWithScheduleData(event) {
  const data = scheduleParser.getContent();
  let scheduleData = {};
  if (data && data.content) {
    scheduleData = data.content.schedule;
  }

  logger.log(event, scheduleData);
}

function notifyPlayingItem() {
  playingItemListeners.forEach(listener=>listener(playingItem));
}

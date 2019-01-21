/* eslint-disable */
let scheduleContent = null;

const RECURRENCE_TYPE = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

const DAY_OF_WEEK = {
  SUNDAY: "Sun",
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
};

const DAY_IN_MILLIS = 1000 * 60 * 60 * 24;

module.exports = {
  scheduledToPlay,
  hasOnlyNoViewerURLItems(data = scheduleContent) {
    if (!module.exports.validateContent(data)) {return false;}

    const noViewerURLs = /(http(s)?:\/\/)?storage\.googleapis\.com\/risemedialibrary.+|(http(s)?:\/\/)?widgets\.risevision\.com\/.+/;

    return data.content.schedule.items.every(item=>{
      if (item.type !== "url") {return false;}
      if (!item.objectReference) {return false;}
      if (typeof item.objectReference !== "string") {return false;}
      if (!noViewerURLs.test(item.objectReference)) {return false;}

      return true;
    });
  },
  millisUntilNextScheduledTime(now, sched = scheduleContent.content.schedule) {
    return sched.items.concat(sched).reduce((nextMillis, item)=>{
      if (is24x7(item)) {return nextMillis;}

      return Math.min(
        nextMillis,
        millisUntilTime(now, item.startTime),
        millisUntilTime(now, item.endTime)
      );
    }, Number.MAX_VALUE);
  },
  entireScheduleIs24x7(sched = scheduleContent.content.schedule) {
    return sched.items.concat(sched).every(is24x7);
  },
  getCurrentPlayableItems(now, sched = scheduleContent.content.schedule) {
    if (!scheduledToPlay(sched, now)) {return [];}

    return sched.items.filter(item=>item.duration && scheduledToPlay(item, now));
  },
  setContent(data) {scheduleContent = data;},
  getContent() {return Object.assign({}, scheduleContent);},
  validateContent(data = scheduleContent) {
    if (!data) {return false;}
    if (!data.content) {return false;}
    if (!data.content.schedule) {return false;}
    if (!data.content.schedule.items) {return false;}
    if (!data.content.schedule.items.length) {return false;}
    if (typeof data.content.schedule.items[0] !== "object") {return false;}

    return true;
  }
};

function is24x7(item) {
  if (!item.timeDefined || !item.startDate) {
    return true;
  }
}

function scheduledToPlay(item, d = new Date()) {
  if (is24x7(item)) {return true;}

  const t = _toTime(d),
    startDate = _toDate(item.startDate),
    endDate = _toDate(item.endDate),
    startTime = _toTime(item.startTime),
    endTime = _toTime(item.endTime);

  d = _toDate(d);

  if (d < startDate) {
    return false;
  }

  if (!item.noEndDate && endDate && d > endDate) {
    return false;
  }

  if (!item.allDay && (startTime !== null) && (endTime !== null)) {
    if (startTime < endTime) {
      if (t < startTime || t > endTime)
        { return false; }
    } else if (t < startTime && t > endTime)
      { return false; }
  }

  const weekday = d.getDay();
  const dayOfMonth = d.getDate();
  if (item.recurrenceFrequency < 1) {
    item.recurrenceFrequency = 1;
  }

  if (item.recurrenceType === RECURRENCE_TYPE.DAILY) {
    const days = _diffDays(startDate, d);

    if (parseInt(days % item.recurrenceFrequency) !== 0) {
      return false;
    }
  } else if (item.recurrenceType === RECURRENCE_TYPE.WEEKLY) {
    const weeks = _diffWeeks(startDate, d);
    if (parseInt(weeks % item.recurrenceFrequency) !== 0) {
      return false;
    }

    if (!_isRecurrenceDay(weekday, item.recurrenceDaysOfWeek)) {
      return false;
    }
  } else if (item.recurrenceType === RECURRENCE_TYPE.MONTHLY) {
    const months = _diffMonths(startDate, d);
    if (item.recurrenceAbsolute) {
      if ((item.recurrenceDayOfMonth !== dayOfMonth) || (parseInt(months % item.recurrenceFrequency) !== 0)) {
        return false;
      }
    } else {
      if ((weekday !== item.recurrenceDayOfWeek) || (parseInt(months % item.recurrenceFrequency) !== 0)) {
        return false;
      }
      // check if the last week of the month is selected recurrenceWeekOfMonth = 4
      if (item.recurrenceWeekOfMonth === 4) {
        if (dayOfMonth <= (_daysInMonth(d) - 7)) {
          return false;
        }
      } else if (item.recurrenceWeekOfMonth != parseInt((dayOfMonth - 1) / 7)) {
        return false;
      }
    }
  } else if (item.recurrenceType === RECURRENCE_TYPE.YEARLY) {
    if (item.recurrenceAbsolute) {
      if (!(((d.getMonth() === item.recurrenceMonthOfYear) && (dayOfMonth === item.recurrenceDayOfMonth)))) {
        return false;
      }
    } else {
      if ((weekday !== item.recurrenceDayOfWeek) || (d.getMonth() !== item.recurrenceMonthOfYear)) {
        return false;
      }
      // check if the last week of the month is selected @RecurrenceWeekOfMonth=4
      if (item.recurrenceWeekOfMonth === 4) {
        if ((dayOfMonth <= (_daysInMonth(d) - 7))) {
	        return false;
        }
      } else if (item.recurrenceWeekOfMonth != parseInt((dayOfMonth - 1) / 7)) {
        return false;
      }
    }
  }

  return true;
}


function _createDate(d) {
  if (d instanceof Date) {
    return d;
  }
  return new Date(d);
}

function _toDate(d) {
  const date = _createDate(d);
  const newDate = new Date();
  newDate.setTime(0);
  newDate.setFullYear(date.getFullYear());
  newDate.setDate(date.getDate());
  newDate.setMonth(date.getMonth());

  return newDate;
}

function _toTime(d) {
  const date = _createDate(d);
  const newDate = new Date();
  newDate.setTime(0);
  newDate.setHours(date.getHours());
  newDate.setMinutes(date.getMinutes());
  newDate.setSeconds(date.getSeconds());

  return newDate;
}

function millisUntilTime(now, timeDate) {
  if (!timeDate || !now) {return Number.MAX_VALUE;}

  let timeComponent = new Date(timeDate);
  timeComponent.setFullYear(now.getFullYear());
  timeComponent.setMonth(now.getMonth());
  timeComponent.setDate(now.getDate());

  return timeComponent > now ? timeComponent - now : Number.MAX_VALUE;
}

function _daysInMonth(d) {
  const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	// check is leap year
  daysInMonths[1] = (parseInt(d.getYear() % 4) === 0) ? 29 : 28;

  return daysInMonths[d.getMonth()];
}

function _diffDays(fromDate, toDate) {
  if (!fromDate || !toDate) {
    return -1;
  }

  return parseInt((toDate.getTime() - fromDate.getTime()) / DAY_IN_MILLIS);
}

function _diffMonths(fromDate, toDate) {
  return parseInt(((toDate.getYear() - fromDate.getYear()) * 12) + toDate.getMonth() - fromDate.getMonth());
}

function _diffWeeks(fromDate, toDate) {
  const days = _diffDays(fromDate, toDate);
  const weeks = (days + fromDate.getDay()) / 7;

  return parseInt(weeks);
}

function _isRecurrenceDay(weekday, recurrenceDaysOfWeek) {
  const dayOfWeeklbl = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][weekday];
  const currDayCode = DAY_OF_WEEK[dayOfWeeklbl];

  if (recurrenceDaysOfWeek && recurrenceDaysOfWeek.indexOf(currDayCode) >= 0) {
    return true;
  } else {
    return false;
  }
}

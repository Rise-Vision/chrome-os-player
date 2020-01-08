/* eslint-disable */
const assert = require("assert");

const scheduleParser = require("../../../src/scheduling/schedule-parser");

const [JAN, FEB, APR, JUN, JUL] = [0, 1, 3, 5, 6];

describe("Schedule Parser", () => {

  const startDate = new Date(2016, FEB, 1);
  const endDate = new Date(2016, JUN, 30);
  const startTime = new Date(0, 0, 0, 12, 30);
  const endTime = new Date(0, 0, 0, 18, 15);

  it("it can play if not time defined", () => {
    assert.equal(scheduleParser.scheduledToPlay({timeDefined: false}), true);
  });

  it("it can play if start time is not defined", () => {
    assert.equal(scheduleParser.scheduledToPlay({}), true);
  });

  it("it cannot play if date is before startDate", () => {
    const beforeDate = new Date(2016, JAN, 1);
    const timeline = {timeDefined: true, startDate, endDate, startTime, endTime};
    assert.equal(scheduleParser.scheduledToPlay(timeline, beforeDate), false);
  });

  it("it cannot play if date is after endDate", () => {
    const afterDate = new Date(2016, JUL, 1);
    const timeline = {timeDefined: true, startDate, endDate, startTime, endTime};
    assert.equal(scheduleParser.scheduledToPlay(timeline, afterDate), false);
  });

  it("it cannot play if time is before startTime, with startTime < endTime", () => {
    const beforeTime = new Date(2016, FEB, 3, 11, 30);
    const afterTime = new Date(2016, FEB, 3, 19, 30);
    const timeline = {timeDefined: true, startDate, endDate, startTime, endTime};

    assert.equal(scheduleParser.scheduledToPlay(timeline, beforeTime), false);
    assert.equal(scheduleParser.scheduledToPlay(timeline, afterTime), false);
  });

  it("it cannot play if time is out of range, with endTime < startTime", () => {
    const startTime = new Date(0, 0, 0, 22, 30);
    const endTime = new Date(0, 0, 0, 9, 15);
    const timeline = {timeDefined: true, startDate, endDate, startTime, endTime};
    const beforeTime = new Date(2016, FEB, 3, 16, 30);
    const afterTime = new Date(2016, FEB, 3, 12, 30);

    assert.equal(scheduleParser.scheduledToPlay(timeline, beforeTime), false);
    assert.equal(scheduleParser.scheduledToPlay(timeline, afterTime), false);
  });

  it("it can play if daily recurrence frequency matches", () => {
    const duringDate = new Date(2016, FEB, 11);
    const timeline = {timeDefined: true, startDate, endDate, recurrenceType: "Daily", recurrenceFrequency: 10};

    assert.equal(scheduleParser.scheduledToPlay(timeline, duringDate), true);
  });

  it("it cannot play if daily recurrence frequency does not match", () => {
    const duringDate = new Date(2016, FEB, 4);
    const timeline = {timeDefined: true, startDate, endDate, recurrenceType: "Daily", recurrenceFrequency: 2};

    assert.equal(scheduleParser.scheduledToPlay(timeline, duringDate), false);
  });

  it("it can play if weekly recurrence frequency matches", () => {
    const duringDate = new Date(2016, FEB, 22);
    const timeline = {timeDefined: true, startDate, endDate, recurrenceType: "Weekly", recurrenceFrequency: 3, recurrenceDaysOfWeek: "Mon"};

    assert.equal(scheduleParser.scheduledToPlay(timeline, duringDate), true);
  });

  it("it can play if weekly recurrence frequency matches", () => {
    const duringDate = new Date(2016, FEB, 22);
    const timeline = {timeDefined: true, startDate, endDate, recurrenceType: "Weekly", recurrenceFrequency: 3, recurrenceDaysOfWeek: ["Mon"]};

    assert.equal(scheduleParser.scheduledToPlay(timeline, duringDate), true);
  });

  it("it cannot play if weekly recurrence days is not specified", () => {
    const duringDate = new Date(2016, FEB, 22);
    const timeline = {timeDefined: true, startDate, endDate, recurrenceType: "Weekly", recurrenceFrequency: 3};

    assert.equal(scheduleParser.scheduledToPlay(timeline, duringDate), false);
  });

  it("it cannot play if weekly recurrence frequency does not match", () => {
    const duringDate = new Date(2016, FEB, 15);
    const timeline = {timeDefined: true, startDate, endDate, recurrenceType: "Weekly", recurrenceFrequency: 3};

    assert.equal(scheduleParser.scheduledToPlay(timeline, duringDate), false);
  });

  it("it cannot play if weekly day recurrence does not match", () => {
    const duringDate = new Date(2016, FEB, 15);
    const timeline = {timeDefined: true, startDate, endDate, recurrenceType: "Weekly", recurrenceFrequency: 2, recurrenceDaysOfWeek: "Sun,Wed,Thu"};

    assert.equal(scheduleParser.scheduledToPlay(timeline, duringDate), false);
  });

  it("it cannot play if weekly day recurrence does not match", () => {
    const duringDate = new Date(2016, FEB, 15);
    const timeline = {timeDefined: true, startDate, endDate, recurrenceType: "Weekly", recurrenceFrequency: 2, recurrenceDaysOfWeek: ["Sun", "Wed", "Thu"]};

    assert.equal(scheduleParser.scheduledToPlay(timeline, duringDate), false);
  });

  it("it can play if absolute monthly recurrence matches", () => {
    const duringDate = new Date(2016, APR, 4);
    const timeline = {timeDefined: true, startDate, endDate, recurrenceType: "Monthly", recurrenceAbsolute: true, recurrenceFrequency: 2, recurrenceDayOfMonth: 4};

    assert.equal(scheduleParser.scheduledToPlay(timeline, duringDate), true);
  });

  it("it cannot play if absolute monthly recurrence does not match", () => {
    const duringDate = new Date(2016, APR, 4);
    const timeline = {timeDefined: true, startDate, endDate, recurrenceType: "Monthly", recurrenceAbsolute: true, recurrenceFrequency: 3, recurrenceDayOfMonth: 4};

    assert.equal(scheduleParser.scheduledToPlay(timeline, duringDate), false);
  });

  it("it cannot play if absolute monthly day recurrence does not match", () => {
    const duringDate = new Date(2016, APR, 4);
    const timeline = {timeDefined: true, startDate, endDate, recurrenceType: "Monthly", recurrenceAbsolute: true, recurrenceFrequency: 2, recurrenceDayOfMonth: 3};

    assert.equal(scheduleParser.scheduledToPlay(timeline, duringDate), false);
  });

  it("it can play if monthly recurrence matches", () => {
    const duringDate = new Date(2016, APR, 11);
    const timeline = {timeDefined: true, startDate, endDate, recurrenceType: "Monthly", recurrenceFrequency: 2, recurrenceDayOfWeek: 1, recurrenceWeekOfMonth: 1};

    assert.equal(scheduleParser.scheduledToPlay(timeline, duringDate), true);
  });

  it("it cannot play if monthly day recurrence does not match", () => {
    const duringDate = new Date(2016, APR, 4);
    const timeline = {timeDefined: true, startDate, endDate, recurrenceType: "Monthly", recurrenceFrequency: 3, recurrenceDayOfWeek: 1};

    assert.equal(scheduleParser.scheduledToPlay(timeline, duringDate), false);
  });

  it("it cannot play if monthly weekday recurrence does not match", () => {
    const duringDate = new Date(2016, APR, 4);
    const timeline = {timeDefined: true, startDate, endDate, recurrenceType: "Monthly", recurrenceFrequency: 2, recurrenceDayOfWeek: 2};

    assert.equal(scheduleParser.scheduledToPlay(timeline, duringDate), false);
  });

  it("it cannot play if monthly last week of month recurrence does not match", () => {
    const duringDate = new Date(2016, APR, 4);
    const timeline = {timeDefined: true, startDate, endDate, recurrenceType: "Monthly", recurrenceFrequency: 2, recurrenceDayOfWeek: 1, recurrenceWeekOfMonth: 4};

    assert.equal(scheduleParser.scheduledToPlay(timeline, duringDate), false);
  });

  it("it cannot play if monthly week of month recurrence does not match", () => {
    const duringDate = new Date(2016, APR, 11);
    const timeline = {timeDefined: true, startDate, endDate, recurrenceType: "Monthly", recurrenceFrequency: 2, recurrenceDayOfWeek: 1, recurrenceWeekOfMonth: 2};

    assert.equal(scheduleParser.scheduledToPlay(timeline, duringDate), false);
  });

  it("it can play if absolute yearly recurrence matches", () => {
    const endDate = new Date(2018, JUN, 30);
    const recurrenceDate = new Date(2017, APR, 4);
    const timeline = {timeDefined: true, startDate, endDate, recurrenceType: "Yearly", recurrenceAbsolute: true, recurrenceMonthOfYear: APR, recurrenceDayOfMonth: 4};

    assert.equal(scheduleParser.scheduledToPlay(timeline, recurrenceDate), true);
  });

  it("it cannot play if absolute yearly recurrence does not match", () => {
    const endDate = new Date(2018, JUN, 30);
    const diffDayDate = new Date(2017, APR, 7);
    const diffMonthDate = new Date(2017, JUN, 4);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Yearly", recurrenceAbsolute: true, recurrenceMonthOfYear: APR, recurrenceDayOfMonth: 4 };

    assert.equal(scheduleParser.scheduledToPlay(timeline, diffDayDate), false);
    assert.equal(scheduleParser.scheduledToPlay(timeline, diffMonthDate), false);
  });

  it("it can play if yearly recurrence matches", () => {
    const endDate = new Date(2018, JUN, 30);
    const recurrenceDate = new Date(2017, APR, 11);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Yearly", recurrenceMonthOfYear: APR, recurrenceDayOfWeek: 2, recurrenceWeekOfMonth: 1 };

    assert.equal(scheduleParser.scheduledToPlay(timeline, recurrenceDate), true);
  });

  it("it cannot play if yearly weekday+month recurrence does not match", () => {
    const endDate = new Date(2018, JUN, 30);
    const diffDayDate = new Date(2017, APR, 7);
    const diffMonthDate = new Date(2017, JUN, 6);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Yearly", recurrenceMonthOfYear: APR, recurrenceDayOfWeek: 2 };

    assert.equal(scheduleParser.scheduledToPlay(timeline, diffDayDate), false);
    assert.equal(scheduleParser.scheduledToPlay(timeline, diffMonthDate), false);
  });

  it("it cannot play if yearly last week of month recurrence does not match", () => {
    const endDate = new Date(2018, JUN, 30);
    const testDate = new Date(2017, APR, 18);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Yearly", recurrenceMonthOfYear: APR, recurrenceDayOfWeek: 2, recurrenceWeekOfMonth: 4 };

    assert.equal(scheduleParser.scheduledToPlay(timeline, testDate), false);
  });

  it("it cannot play if yearly week of month recurrence does not match", () => {
    const endDate = new Date(2018, JUN, 30);
    const testDate = new Date(2017, APR, 11);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Yearly", recurrenceMonthOfYear: APR, recurrenceDayOfWeek: 2, recurrenceWeekOfMonth: 2 };

    assert.equal(scheduleParser.scheduledToPlay(timeline, testDate), false);
  });

  it("should detect when there is only no viewer supported URL", () => {
    const urlItem = {
      type: "url",
      objectReference: ""
    };

    const data = {
      content: {
        schedule: {
          items: [urlItem]
        }
      }
    };

    urlItem.objectReference = "storage.googleapis.com/risemedialibrary-7d948ac7-decc-4ed3-aa9c-9ba43bda91dc/pwa-examples/js13kpwa/index4.html";
    assert.equal(scheduleParser.hasOnlyNoViewerURLItems(data), false);

    urlItem.objectReference = "http://storage.googleapis.com/risemedialibrary-7d948ac7-decc-4ed3-aa9c-9ba43bda91dc/pwa-examples/js13kpwa/index4.html";
    assert.equal(scheduleParser.hasOnlyNoViewerURLItems(data), false);

    urlItem.objectReference = "https://storage.googleapis.com/risemedialibrary-7d948ac7-decc-4ed3-aa9c-9ba43bda91dc/pwa-examples/js13kpwa/index4.html";
    assert.equal(scheduleParser.hasOnlyNoViewerURLItems(data), false);

    urlItem.objectReference = "http://widgets.risevision.com/staging/pages/2018.12.28.14.00/src/rise-data-image.html";
    assert.equal(scheduleParser.hasOnlyNoViewerURLItems(data), false);

    urlItem.objectReference = "https://widgets.risevision.com/staging/pages/2018.12.28.14.00/src/rise-data-image.html";
    assert.equal(scheduleParser.hasOnlyNoViewerURLItems(data), false);
  });

  it("should return false when not every item supports no viewer mode", () => {
    const urlItem = {
      type: "url",
      objectReference: ""
    };

    const data = {
      content: {
        schedule: {
          items: [urlItem, { type: "url", objectReference: "www.risevision.com" }]
        }
      }
    };

    urlItem.objectReference = "storage.googleapis.com/risemedialibrary-7d948ac7-decc-4ed3-aa9c-9ba43bda91dc/pwa-examples/js13kpwa/index4.html";
    assert.equal(scheduleParser.hasOnlyNoViewerURLItems(data), false);

    urlItem.objectReference = "http://storage.googleapis.com/risemedialibrary-7d948ac7-decc-4ed3-aa9c-9ba43bda91dc/pwa-examples/js13kpwa/index4.html";
    assert.equal(scheduleParser.hasOnlyNoViewerURLItems(data), false);

    urlItem.objectReference = "https://storage.googleapis.com/risemedialibrary-7d948ac7-decc-4ed3-aa9c-9ba43bda91dc/pwa-examples/js13kpwa/index4.html";
    assert.equal(scheduleParser.hasOnlyNoViewerURLItems(data), false);

    urlItem.objectReference = "http://widgets.risevision.com/staging/pages/2018.12.28.14.00/src/rise-data-image.html";
    assert.equal(scheduleParser.hasOnlyNoViewerURLItems(data), false);

    urlItem.objectReference = "https://widgets.risevision.com/staging/pages/2018.12.28.14.00/src/rise-data-image.html";
    assert.equal(scheduleParser.hasOnlyNoViewerURLItems(data), false);
  });

  it("should return false when multiple items supports no viewer mode", () => {
    const urlItem = {
      type: "url",
      objectReference: "http://storage.googleapis.com/risemedialibrary-7d948ac7-decc-4ed3-aa9c-9ba43bda91dc/pwa-examples/js13kpwa/index4.html"
    };

    const templateItem = {
      name: "Copy of Single Agriculture",
      type: "presentation",
      presentationType: "HTML Template",
      objectReference: "8c5059bc-f6f1-4c2b-b886-eccc1d37ed74",
      duration: 30,
      timeDefined: false
    };

    const data = {
      content: {
        schedule: {
          items: [urlItem, templateItem]
        }
      }
    };

    assert.equal(scheduleParser.hasOnlyNoViewerURLItems(data), false);

  });
});

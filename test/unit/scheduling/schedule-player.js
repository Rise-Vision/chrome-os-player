const assert = require("assert");
const sinon = require("sinon");
const logger = require("../../../src/logging/logger");

const schedulePlayer = require("../../../src/scheduling/schedule-player");
const scheduleParser = require("../../../src/scheduling/schedule-parser");
const systemInfo = require('../../../src/logging/system-info');

const sandbox = sinon.createSandbox();

const ONE_MINUTE_MILLIS = 60000;

describe("Schedule Player", ()=>{
  const played = [];

  beforeEach(()=>{
    sandbox.stub(logger, "log");
    sandbox.stub(systemInfo, "isBeta").returns(false);
    sandbox.stub(global, "setTimeout");
    schedulePlayer.setPlayUrlHandler(url=>played.push(url));
    played.length = 0;
  });

  afterEach(() => sandbox.restore());

  describe("Schedule Data Validation", ()=>{
    const testData = [
      null,
      {},
      {content: {}},
      {content: {schedule: {}}},
      {content: {schedule: {items: []}}},
      {content: {schedule: {items: ['should be an object']}}}
    ];

    const nothingPlayingListener = sandbox.spy();

    testData.forEach(test=>{
      it(`calls nothing playing handler and logs external for ${JSON.stringify(test)}`, ()=>{
        scheduleParser.setContent(testData);
        schedulePlayer.listenForNothingPlaying(nothingPlayingListener);

        schedulePlayer.start();

        sinon.assert.calledWith(logger.log, "invalid schedule data");
        sinon.assert.called(nothingPlayingListener);
      });
    });
  });

  describe("Playability re-check", ()=>{
    it("doesn't schedule a check for playability if everything is 24/7", ()=>{
      const testData = {content: {
        schedule: {
          timeDefined: false,
          items: [
            {
              timeDefined: false,
              duration: 10
            }
          ]
        }}};

      scheduleParser.setContent(testData);
      schedulePlayer.start();
      assert.notEqual(setTimeout.getCall(0).args[0].name, "start");
    });

    it("schedules a check for playability if schedule start time later in the day", ()=>{
      const startTimeMillisFromNow = 5000;

      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: true,
          startDate: new Date(),
          startTime: new Date(Date.now() + startTimeMillisFromNow),
          items: [
            {
              name: "test item 1",
              timeDefined: false,
              duration: 10
            }
          ]
        }
      }};

      scheduleParser.setContent(testData);
      schedulePlayer.start();
      assert.equal(setTimeout.getCall(0).args[0].name, "start");
      assert(scheduledDelayFor(startTimeMillisFromNow));
    });

    it("schedules a check for playability if an item start time is later in the day", ()=>{
      const startTimeMillisFromNow = 5000;

      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: true,
          startDate: new Date(),
          startTime: new Date(),
          items: [
            {
              name: "test item 1",
              timeDefined: true,
              startDate: new Date(),
              startTime: new Date(Date.now() + startTimeMillisFromNow)
            }
          ]
        }
      }};

      scheduleParser.setContent(testData);
      schedulePlayer.start();
      assert.equal(setTimeout.getCall(0).args[0].name, "start");
      assert(scheduledDelayFor(startTimeMillisFromNow));
    });

    it("schedules the earliest item", ()=>{
      const startTimeMillisFromNow = 5000;
      const laterStartTimeMillisFromNow = 20000;

      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: true,
          startDate: new Date(),
          startTime: new Date(),
          items: [
            {
              name: "test item 1",
              timeDefined: true,
              startDate: new Date(),
              startTime: new Date(Date.now() + laterStartTimeMillisFromNow)
            },
            {
              name: "test item 2",
              timeDefined: true,
              startDate: new Date(),
              startTime: new Date(Date.now() + startTimeMillisFromNow)
            }
          ]
        }
      }};

      scheduleParser.setContent(testData);
      schedulePlayer.start();
      assert.equal(setTimeout.getCall(0).args[0].name, "start");
      assert(scheduledDelayFor(startTimeMillisFromNow));
    });

    it("schedules a check for playability at the start of the next day", ()=>{
      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: true,
          startDate: new Date(),
          startTime: new Date(Date.now()),
          items: [
            {
              name: "test item 1",
              timeDefined: true,
              startDate: new Date(),
              startTime: new Date()
            }
          ]
        }
      }};

      scheduleParser.setContent(testData);
      schedulePlayer.start();
      assert.equal(setTimeout.getCall(0).args[0].name, "start");
      assert(scheduledForTomorrow());
    });

    function scheduledDelayFor(expectedDelay) {
      const allowedVariance = 100;
      const scheduledDelay = setTimeout.getCall(0).args[1];

      return expectedDelay - scheduledDelay < allowedVariance;
    }

    function scheduledForTomorrow() {
      const acceptableMillisPrecisionIntoNextDay = 10000;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0);
      tomorrow.setMinutes(0);
      tomorrow.setSeconds(0);

      const scheduledDelay = setTimeout.getCall(0).args[1];
      const scheduledDate = new Date(Date.now() + scheduledDelay);

      return scheduledDate - tomorrow > 0 &&
      scheduledDate - tomorrow < acceptableMillisPrecisionIntoNextDay;
    }
  });

  describe("Current playable items", ()=>{
    it("logs externally if no playable items exist", ()=>{
      const futureStartTime = new Date(Date.now() + 5000);
      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: false,
          items: [
            {
              name: "future item",
              timeDefined: true,
              startDate: new Date(Date.now()),
              startTime: futureStartTime,
              endTime: new Date(futureStartTime.getTime() + ONE_MINUTE_MILLIS),
              objectReference: "test-url-1"
            }
          ]
        }
      }};
      scheduleParser.setContent(testData);
      schedulePlayer.start();

      sinon.assert.calledWith(logger.log, "no playable items");
    });

    it("plays playable items", ()=>{
      setTimeout.reset();
      setTimeout.onFirstCall().yields();

      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: false,
          items: [
            {
              name: "test item 1",
              timeDefined: false,
              objectReference: "test-url-1",
              duration: 10
            },
            {
              name: "test item 2",
              timeDefined: false,
              objectReference: "test-url-2",
              duration: 10
            }
          ]
        }
      }};
      scheduleParser.setContent(testData);
      schedulePlayer.start();

      assert(played.includes("test-url-1") && played.includes("test-url-2"));
    });

    it("doesn't play playable items if they have no duration", ()=>{
      setTimeout.reset();
      setTimeout.onFirstCall().yields();

      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: false,
          items: [
            {
              name: "test item 1",
              timeDefined: false,
              objectReference: "test-url-1",
              duration: 0
            },
            {
              name: "test item 2",
              timeDefined: false,
              objectReference: "test-url-2"
            }
          ]
        }
      }};
      scheduleParser.setContent(testData);
      schedulePlayer.start();

      assert.equal(played.length, 0);
    });

    it("doesn't reload a url duplicated in multiple schedule items", ()=>{
      setTimeout.reset();
      setTimeout.onFirstCall().yields();

      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: false,
          items: [
            {
              name: "test item 1",
              timeDefined: false,
              objectReference: "test-same-url",
              duration: 10
            },
            {
              name: "test item 2",
              timeDefined: false,
              objectReference: "test-same-url",
              duration: 10
            }
          ]
        }
      }};
      scheduleParser.setContent(testData);
      schedulePlayer.start();

      assert.equal(played.length, 1);
      assert(played.includes("test-same-url"));
    });

    it("continues playing item if start is called and item is still valid", ()=>{
      setTimeout.reset();
      setTimeout.returns();

      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: false,
          items: [
            {
              name: "test item 5",
              timeDefined: false,
              objectReference: "test-url-1",
              duration: 10
            },
            {
              name: "test item 6",
              timeDefined: false,
              objectReference: "test-url-2",
              duration: 10
            }
          ]
        }
      }};
      scheduleParser.setContent(testData);
      schedulePlayer.start();
      schedulePlayer.start();

      assert.equal(played.includes("test-url-1"), true);
      assert.equal(played.includes("test-url-2"), false);
    });
  });

  describe("Scenarios", ()=>{
    let timedCalls = [];
    let simulatedTimeDate = null;
    let timerId = 0;

    beforeEach(()=>{
      setTimeout.restore();
      sandbox.stub(schedulePlayer, "now").callsFake(()=>simulatedTimeDate);
      sandbox.stub(global, "setTimeout").callsFake((fn, millis)=>{
        timerId += 1;
        timedCalls.push([fn, simulatedTimeDate.getTime() + millis, timerId]);
        return timerId;
      });
      sandbox.stub(global, "clearTimeout").callsFake(clearableId=>{
        timedCalls = timedCalls.filter(call=>call[2] !== clearableId);
      });

      schedulePlayer.stop();
    });

    describe("24x7 primary schedule with two 24x7 items", ()=>{
      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: false,
          items: [
            {
              name: "test item 5",
              timeDefined: false,
              objectReference: "test-url-1",
              duration: 10
            },
            {
              name: "test item 6",
              timeDefined: false,
              objectReference: "test-url-2",
              duration: 10
            }
          ]
        }
      }};

      it("continuously alternates between the two presentations", ()=>{
        simulatedTimeDate = new Date("12-23-2018 3:00:00 PM");

        scheduleParser.setContent(testData);
        schedulePlayer.start();

        timeTravelTo("12-23-2018 3:00:01 PM");
        assert.equal(played.length, 1);
        assert.equal(played[played.length - 1], "test-url-1");

        timeTravelTo("12-23-2018 3:00:11 PM");
        assert.equal(played.length, 2);
        assert.equal(played[played.length - 1], "test-url-2");

        timeTravelTo("12-23-2018 3:01:00 PM");
        assert.equal(played.length, 7);
        assert.equal(played.filter(url=>url.endsWith("1")).length, 4);
        assert.equal(played.filter(url=>url.endsWith("2")).length, 3);
        assert.equal(played[played.length - 1], "test-url-1");
      });
    });

    describe("9 to 5 primary schedule with two 24x7 items", ()=>{
      const testData = {content: {
        schedule: {
          name: "test schedule 9 to 5",
          timeDefined: true,
          startDate: "Dec 5, 2018 12:00:00 AM",
          startTime: "Dec 6, 2018 9:00:00 AM",
          endTime: "Dec 6, 2018 5:00:00 PM",

          items: [
            {
              name: "test item 5",
              timeDefined: false,
              objectReference: "test-url-1",
              duration: 10
            },
            {
              name: "test item 6",
              timeDefined: false,
              objectReference: "test-url-2",
              duration: 10
            }
          ]
        }
      }};

      it("alternates between the two presentations until outside primary schedule time", ()=>{
        simulatedTimeDate = new Date("12-05-2018 3:00:00 PM");
        const tenSecondRotationsinTwoHours = 720;

        scheduleParser.setContent(testData);
        schedulePlayer.start();

        timeTravelTo("12-05-2018 7:00:00 PM");
        assert.equal(played.length, tenSecondRotationsinTwoHours);
      });
    });

    describe("9 to 5 primary schedule with one off-day item and one off-time item", ()=>{
      const testData = {content: {
        schedule: {
          name: "test schedule 9 to 5",
          timeDefined: true,
          startDate: "Dec 5, 2018 12:00:00 AM",
          startTime: "Dec 6, 2018 9:00:00 AM",
          endTime: "Dec 6, 2018 5:00:00 PM",

          items: [
            {
              name: "test item 5",
              timeDefined: true,
              startDate: "Dec 5, 2018 12:00:00 AM",
              startTime: "Dec 6, 2018 7:00:00 PM",
              endTime: "Dec 6, 2018 9:00:00 PM",
              objectReference: "test-url-1",
              duration: 10
            },
            {
              name: "test item 6",
              timeDefined: true,
              startDate: "Dec 5, 2018 12:00:00 AM",
              startTime: "Dec 6, 2018 4:00:00 PM",
              endTime: "Dec 6, 2018 9:00:00 PM",
              recurrenceType: "Weekly",
              recurrenceFrequency: 1,
              recurrenceAbsolute: true,
              recurrenceDaysOfWeek: ["Tue"],
              recurrenceDayOfWeek: 0,
              recurrenceDayOfMonth: 1,
              recurrenceWeekOfMonth: 0,
              recurrenceMonthOfYear: 0,
              objectReference: "test-url-2",
              duration: 10
            }
          ]
        }
      }};

      it("plays nothing as both items are off schedule", ()=>{
        simulatedTimeDate = new Date("12-05-2018 3:00:00 PM");

        scheduleParser.setContent(testData);
        schedulePlayer.start();

        timeTravelTo("12-09-2018 9:00:00 PM");
        assert.equal(played.length, 0);
      });
    });

    describe("9 to 5 primary schedule with one on-day item and one off-time item", ()=>{
      const testData = {content: {
        schedule: {
          name: "test schedule 9 to 5",
          timeDefined: true,
          startDate: "Dec 5, 2018 12:00:00 AM",
          startTime: "Dec 6, 2018 9:00:00 AM",
          endTime: "Dec 6, 2018 5:00:00 PM",

          items: [
            {
              name: "test item 5",
              timeDefined: true,
              startDate: "Dec 5, 2018 12:00:00 AM",
              startTime: "Dec 6, 2018 7:00:00 PM",
              endTime: "Dec 6, 2018 9:00:00 PM",
              objectReference: "test-url-1",
              duration: 10
            },
            {
              name: "test item 6",
              timeDefined: true,
              startDate: "Dec 5, 2018 12:00:00 AM",
              startTime: "Dec 6, 2018 4:00:00 PM",
              endTime: "Dec 6, 2018 9:00:00 PM",
              recurrenceType: "Weekly",
              recurrenceFrequency: 1,
              recurrenceAbsolute: true,
              recurrenceDaysOfWeek: ["Wed"],
              recurrenceDayOfWeek: 0,
              recurrenceDayOfMonth: 1,
              recurrenceWeekOfMonth: 0,
              recurrenceMonthOfYear: 0,
              objectReference: "test-url-2",
              duration: 10
            }
          ]
        }
      }};

      it("plays the on-day item once as time passes over the correct day", ()=>{
        simulatedTimeDate = new Date("12-05-2018 3:00:00 PM");

        scheduleParser.setContent(testData);
        schedulePlayer.start();

        timeTravelTo("12-09-2018 9:00:00 PM");
        assert.equal(played.length, 1);
      });

      it("plays the on-day item 3 times as over 2 weeks go by", ()=>{
        simulatedTimeDate = new Date("12-05-2018 3:00:00 PM");

        scheduleParser.setContent(testData);
        schedulePlayer.start();

        timeTravelTo("12-21-2018 9:00:00 PM");
        assert.equal(played.length, 3);
      });
    });

    function timeTravelTo(targetTimeMillis) {
      if (typeof targetTimeMillis === "string") {targetTimeMillis = Date.parse(targetTimeMillis);} // eslint-disable-line no-param-reassign
      if (typeof targetTime === "object") {targetTimeMillis = targetTimeMillis.getTime();} // eslint-disable-line no-param-reassign

      if (targetTimeMillis === simulatedTimeDate.getTime()) {return;}
      if (targetTimeMillis < simulatedTimeDate.getTime()) {
        throw Error("Cannot travel backwards through time");
      }

      while (timedCalls.length) {
        timedCalls.sort((one, other) => one[1] - other[1]);

        if (timedCalls[0][1] > targetTimeMillis) {return;}

        simulatedTimeDate = new Date(timedCalls[0][1]);
        timedCalls.shift()[0]();
      }
    }
  });
});

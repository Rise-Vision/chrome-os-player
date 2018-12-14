const systemInfo = require('./logging/system-info');
const scheduleParser = require('./scheduling/schedule-parser');

let playerConfigurationObject = null;

Promise.all([
  systemInfo.getDisplayId(),
  systemInfo.getPlayerVersion({includeBetaPrefix: false}),
  systemInfo.isBeta(),
  systemInfo.getOS()
])
.then(([displayId, playerVersion, isBeta, os]) => {
  playerConfigurationObject = {
    playerInfo: {
      displayId,
      playerType: isBeta ? "beta" : "stable",
      playerVersion,
      os
    },
    localMessagingInfo: {
      player: "chromeos",
      connectionType: "window"
    }
  };
});

module.exports = {
  getRisePlayerConfiguration() {

    const data = scheduleParser.getContent();
    let companyId = "";
    if (data && data.content && data.content.schedule) {
      companyId = data.content.schedule.companyId;
    }

    playerConfigurationObject.playerInfo.companyId = companyId;

    return playerConfigurationObject;
  }
}

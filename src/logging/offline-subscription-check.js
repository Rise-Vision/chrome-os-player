const logger = require('./logger');
const util = require('../util');
const productCode = "c4b368be86245bf9501baaa6e0b00df9719869fd";
const authorizationUrl = `https://store-dot-rvaserver2.appspot.com/v1/widget/auth?id=DID&pc=${productCode}&startTrial=false`;

function isSubscribed() {
  return util.getDisplayId()
    .then(displayId => util.fetchWithRetry(authorizationUrl.replace('DID', displayId)))
    .then(resp => resp.json())
    .then(status => status.authorized)
    .catch(err => {
      logger.error('error getting subscription status', err);
      return false;
    });
}

module.exports = {
  isSubscribed
};

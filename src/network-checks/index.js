const logger = require('../logging/logger');
const ONE_SECOND_MILLIS = 1000;
const TIMEOUT_MILLIS = 60000;
const TIMEOUT_ERROR = Error('network-check-timeout');
const siteList = [
  "https://services.risevision.com/healthz",
  "https://viewer.risevision.com",
  "https://storage-dot-rvaserver2.appspot.com",
  "https://store.risevision.com",
  "https://aws.amazon.com/s3/",
  "https://storage.googleapis.com/install-versions.risevision.com/display-modules-manifest.json",
  "https://www.googleapis.com/storage/v1/b/install-versions.risevision.com/o/installer-win-64.exe?fields=kind"
];

let result = null;
let isComplete = false;
let secondsRemaining = TIMEOUT_MILLIS / ONE_SECOND_MILLIS;

module.exports = {
  checkSites() {
    const checks = Promise.all(siteList.map(site=>{
      console.log('Checking networking', site);
      return fetch(site).then(resp=>{
        console.log(site, resp.status);
        return resp.ok ? "" : Promise.reject(Error(site))
      })
      .catch(err=>{
        if (!err.message.startsWith("http")) {err.message = `${site} ${err.message}`}

        logger.error(err);
        return Promise.reject(err);
      });
    }));

    result = Promise.race([
      checks,
      new Promise((res, rej)=>{
        setTimeout(()=>rej(TIMEOUT_ERROR), TIMEOUT_MILLIS);
        const cancelInterval = setInterval(()=>{
          if (secondsRemaining === 0) {return cancelInterval}
          secondsRemaining -= 1
        }, ONE_SECOND_MILLIS);
      })
    ]);

    result.then(()=>isComplete = true);

    return result;
  },
  getResult() {
    return result || Promise.reject(Error('checkSites not called'));
  },
  haveCompleted() {
    return isComplete;
  },
  secondsRemaining() {
    return secondsRemaining;
  }
};

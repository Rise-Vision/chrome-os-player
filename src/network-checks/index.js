const ONE_SECOND_MILLIS = 1000;
const TIMEOUT_MILLIS = 60000;
const TIMEOUT_ERROR = Error('network-check-timeout');
const NOT_ONLINE_ERROR = Error('network-not-online');
const siteList = [
  "http://viewer.risevision.com",
  "http://widgets.risevision.com/widget-image/0.1.1/dist/widget.html",
  "http://s3.amazonaws.com/widget-video-rv/1.1.0/dist/widget.html",
  "https://services.risevision.com/healthz",
  "https://storage-dot-rvaserver2.appspot.com",
  "https://store.risevision.com",
  "https://s3.amazonaws.com/widget-video-rv/1.1.0/dist/widget.html",
  "https://storage.googleapis.com/install-versions.risevision.com/display-modules-manifest.json",
  "https://www.googleapis.com/storage/v1/b/install-versions.risevision.com/o/installer-win-64.exe?fields=kind"
];

let result = null;
let isComplete = false;
let secondsRemaining = TIMEOUT_MILLIS / ONE_SECOND_MILLIS;

module.exports = {
  checkSites() {
    const checks = Promise.all(siteList.map(site=>{
      return fetch(site).then(resp=>{
        return resp.ok ? "" : Promise.reject(Error(site))
      })
      .catch(err=>{
        if (!err.message.startsWith("http")) {err.message = `${site} ${err.message}`}
        return Promise.reject(err);
      });
    }));

    const race = [
      checks,
      new Promise((res, rej)=>{
        setTimeout(()=>rej(TIMEOUT_ERROR), TIMEOUT_MILLIS);
        const cancelInterval = setInterval(()=>{
          if (secondsRemaining === 0) {return cancelInterval}
          secondsRemaining -= 1
        }, ONE_SECOND_MILLIS);
      })
    ];

    result = checkOnLineStatus().then(() => Promise.race(race));

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
  },
  retry() {
    isComplete = false;
    module.exports.checkSites();
  }
};

function checkOnLineStatus() {
  if (!navigator.onLine) {
    return Promise.reject(NOT_ONLINE_ERROR);
  }
  return Promise.resolve();
}

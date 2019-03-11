const logger = require('../logging/logger');

const siteList = [
  "https://services.risevision.com/healthz",
  "https://viewer.risevision.com",
  "https://storage-dot-rvaserver2.appspot.com",
  "https://store.risevision.com",
  "https://aws.amazon.com/s3/",
  "https://storage.googleapis.com/install-versions.risevision.com/display-modules-manifest.json",
  "https://www.googleapis.com/storage/v1/b/install-versions.risevision.com/o/installer-win-64.exe?fields=kind"
];

module.exports = {
  reportConnectivity() {
    siteList.forEach(site=>{
      return fetch(site)
      .then(response=>{
        logger.log("downtime network check", {url: site, statusCode: response.status});
      }).catch(error=>{
        logger.log("downtime network error", {url: site, error: error.message});
      });
    });
  }
};

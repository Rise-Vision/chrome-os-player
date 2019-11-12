const assert = require('assert');
const sinon = require('sinon');
const chrome = require('sinon-chrome/apps');
const util = require('../../../src/util');

const systemInfo = require('../../../src/logging/system-info');

const sandbox = sinon.createSandbox();

describe('System Info', () => {

  after(() => chrome.flush());

  afterEach(() => sandbox.restore());

  it('should return display id as id', () => {
    chrome.storage.local.get.yields({displayId: 'displayId'});

    return systemInfo.getId()
      .then((id) => {
        assert.equal(id, 'displayId');
      });
  });

  it('should return machine id as id when there is no saved display id', () => {
    chrome.storage.local.get.yields({machineId: 'machineId'});

    return systemInfo.getId()
      .then((id) => {
        assert.equal(id, '0.machineId');
      });
  });

  it('should return OS', () => {
    chrome.runtime.getPlatformInfo.yields({os: 'OS', arch: 'arch'});

    return systemInfo.getOS()
      .then((os) => {
        assert.equal(os, 'OS/arch');
      });
  });

  it('should return the first IP v4 address', () => {
    chrome.system.network.getNetworkInterfaces.yields([
      {address: 'fe80::95:69f4:293e:e364'},
      {address: '2804:14d:bad4:9e8e:147e:185b:af43:4b1'},
      {address: '192.168.0.12'},
      {address: '10.0.0.1'}
    ]);

    return systemInfo.getIpAddress()
      .then((ip) => {
        assert.equal(ip, '192.168.0.12');
      });
  });

  it('should return empty when there is no IP v4 address', () => {
    chrome.system.network.getNetworkInterfaces.yields([
      {address: 'fe80::95:69f4:293e:e364'},
      {address: '2804:14d:bad4:9e8e:147e:185b:af43:4b1'},
      {address: '2804:14d:bad4:9e8e:5da0:eea4:8902:6d59'}
    ]);

    return systemInfo.getIpAddress()
      .then((ip) => {
        assert.equal(ip, '');
      });
  });

  it('should return player name', () => {
    chrome.runtime.getManifest.returns({name: 'Rise Player'});

    const playerVersion = systemInfo.getPlayerName();

    assert.equal(playerVersion, 'RisePlayer');
  });

  it('should return beta player name', () => {
    chrome.runtime.getManifest.returns({name: 'Rise Player Beta'});

    const playerVersion = systemInfo.getPlayerName();

    assert.equal(playerVersion, '(Beta) RisePlayer');
  });

  it('should return player version', () => {
    chrome.runtime.getManifest.returns({name: 'Rise Player', version: 'version'});

    const playerVersion = systemInfo.getPlayerVersion();

    assert.equal(playerVersion, 'version');
  });

  it('should return player beta version', () => {
    chrome.runtime.getManifest.returns({name: 'Rise Player Beta', version: 'version'});

    const playerVersion = systemInfo.getPlayerVersion();

    assert.equal(playerVersion, 'beta_version');
  });

  it('should return player beta version without prefix', () => {
    chrome.runtime.getManifest.returns({name: 'Rise Player Beta', version: 'version'});

    const playerVersion = systemInfo.getPlayerVersion({includeBetaPrefix: false});

    assert.equal(playerVersion, 'version');
  });

  it('should return Chrome version', () => {
    global.navigator = {appVersion: '5.0 (X11; CrOS x86_64 10323.9.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.35 Safari/537.36'};

    const chromeVersion = systemInfo.getChromeVersion();

    assert.equal(chromeVersion, '65.0.3325.35');

    Reflect.deleteProperty(global, 'navigator');
  });

  it('should return Chrome OS version', () => {
    global.navigator = {appVersion: '5.0 (X11; CrOS x86_64 10323.9.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.35 Safari/537.36'};

    const chromeOSVersion = systemInfo.getChromeOSVersion();

    assert.equal(chromeOSVersion, '10323.9.0');

    Reflect.deleteProperty(global, 'navigator');
  });

  it('should return empty Chrome OS version when not running on Chrome OS', () => {
    global.navigator = {appVersion: '5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.186 Safari/537.36'};

    const chromeOSVersion = systemInfo.getChromeOSVersion();

    assert.equal(chromeOSVersion, '');

    Reflect.deleteProperty(global, 'navigator');
  });

  it('should return display id', () => {
    chrome.storage.local.get.yields({displayId: 'displayId'});

    return systemInfo.getDisplayId()
      .then((id) => {
        assert.equal(id, 'displayId');
      });
  });

  it('should return machine id', () => {
    chrome.storage.local.get.yields({machineId: 'machineId'});

    return systemInfo.getMachineId()
      .then((id) => {
        assert.equal(id, 'machineId');
      });
  });

  it('should generate machine id when it is not yet stored', () => {
    chrome.storage.local.get.yields({});
    sandbox.stub(util, 'sha1').resolves('hash')
    return systemInfo.getMachineId()
      .then((id) => {
        assert.equal(id, 'hash');
      });
  });

  it('should return appid', () => {
    chrome.runtime.id = 'appid';
    assert.equal(systemInfo.getAppId(), 'appid');
  });

  it('should return stage environment flag when configured to stage', () => {
    chrome.storage.local.get.yields({environment: "stage"});
    return systemInfo.isStageEnvironment().then(isStaging => {
      assert.equal(isStaging, true);
    });
  });

  it('should return stage environment flag when configured to stage with different case', () => {
    chrome.storage.local.get.yields({environment: "StAge"});
    return systemInfo.isStageEnvironment().then(isStaging => {
      assert.equal(isStaging, true);
    });
  });

  it('should return stage environment flag as false when environment not configured', () => {
    chrome.storage.local.get.yields({});
    return systemInfo.isStageEnvironment().then(isStaging => {
      assert.equal(isStaging, false);
    });
  });

  it('should return stage environment flag as false when environment configure to something else', () => {
    chrome.storage.local.get.yields({environment: "testing"});
    return systemInfo.isStageEnvironment().then(isStaging => {
      assert.equal(isStaging, false);
    });
  });

});

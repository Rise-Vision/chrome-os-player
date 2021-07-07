# Chrome OS Player [![Circle CI](https://circleci.com/gh/Rise-Vision/chrome-os-player.svg?style=svg)](https://circleci.com/gh/Rise-Vision/chrome-os-player) [![Coverage Status](https://coveralls.io/repos/github/Rise-Vision/chrome-os-player/badge.svg?branch=master)](https://coveralls.io/github/Rise-Vision/chrome-os-player?branch=master)

## Introduction

## Development

### Local Development Environment Setup and Installation

*  Clone repository:
```bash
git clone https://github.com/Rise-Vision/chrome-os-player.git
```

*  Install:
```bash
npm install
```

* Build:
```bash
npm run watch
```

* Test:
```bash
npm run test
```

* Edit the files under `src`. Webpack will generate a `*.bundle.js` files into `app`. This directory contains all the files required for the packaged app.

* Load the packaged app directory `app` on `chrome://extensions`

# Version Restrictions

The manifest will restrict chrome updates based on the
*required_platform_version* field if running as a kiosk app.

This [help page](https://support.google.com/chrome/a/answer/9273974?hl=en)
describes the functionality.

The
[buildspecs](https://chromium.googlesource.com/chromiumos/manifest-versions/+/master/paladin/buildspecs/)
can be used to look up the platform versions for a particular chrome version.

For past and future release dates see the [rollout schedule](https://chromiumdash.appspot.com/schedule).

The [Chrome Releases
blog](https://chromereleases.googleblog.com/2020/05/stable-channel-update-for-chrome-os.html)
includes notifications of Chrome OS updates including Chrome version and
Platform version.

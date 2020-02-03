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

const path = require("path");

module.exports = {
  entry: {
    "background": path.join(__dirname, "src", "background.js"),
    "registration": path.join(__dirname, "src", "registration.js"),
    "viewer": path.join(__dirname, "src", "viewer.js")
  },
  output: {
    path: path.join(__dirname, "app"),
    filename: "[name].bundle.js"
  },
  module: {
    rules: [{
      test: /\.(html)$/,
      use: {
        loader: 'html-loader',
        options: {
          attrs: false
        }
      }
    }]
  }
};

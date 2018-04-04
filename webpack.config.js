const path = require("path");

module.exports = {
  entry: {
    "background": path.join(__dirname, "src", "background.js"),
    "display-id": path.join(__dirname, "src", "display-id.js"),
    "registration": path.join(__dirname, "src", "registration.js"),
    "claim-id": path.join(__dirname, "src", "claim-id.js"),
    "viewer": path.join(__dirname, "src", "viewer.js")
  },
  output: {
    path: path.join(__dirname, "app"),
    filename: "[name].bundle.js"
  }
};

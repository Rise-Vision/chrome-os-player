const path = require("path");

module.exports = {
  entry: {
    background: path.join(__dirname, "src", "background.js"),
    registration: path.join(__dirname, "src", "display-registration/registration.js"),
    player: path.join(__dirname, "src", "player.js")
  },
  output: {
    path: path.join(__dirname, "app"),
    filename: "[name].bundle.js"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader"
      },
      {
        test: /\.(html)$/,
        use: {
          loader: "html-loader",
          options: {
            attrs: false
          }
        }
      }
    ]
  },
  node: {
    fs: "empty"
  }
};

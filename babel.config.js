const presets = [
  [
    "@babel/env", {
      targets: {
        chrome: "42"
      },
      useBuiltIns: "usage"
    }
  ]
];

const plugins = ["@babel/plugin-transform-modules-commonjs"];

module.exports = {
  presets,
  plugins
};

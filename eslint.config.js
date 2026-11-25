// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const globals = require("globals");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "android/*", "ios/*"],
  },
  {
    // Scripts de geração e publicação (Node.js, CommonJS).
    files: ["scripts/**/*.js"],
    languageOptions: { globals: globals.node, sourceType: "commonjs" },
  },
  {
    files: ["test/**/*.js"],
    languageOptions: { globals: globals.node, sourceType: "module" },
  },
]);

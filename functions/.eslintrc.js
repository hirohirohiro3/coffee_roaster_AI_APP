module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "quotes": ["error", "double"],
    "indent": ["error", 2],
    "object-curly-spacing": ["error", "always"],
    "max-len": "off", // 1行の最大文字数制限を無効化
  },
  parserOptions: {
    "ecmaVersion": 2020, // Modern ECMAScript features
    "sourceType": "module", // Allows for the use of imports
  },
};
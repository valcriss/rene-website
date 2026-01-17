const js = require("@eslint/js");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const prettier = require("eslint-config-prettier");
const globals = require("globals");

module.exports = [
  {
    ignores: ["dist/**", "coverage/**", "tests/**/*.js"]
  },
  js.configs.recommended,
  prettier,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "no-console": "error"
    }
  }
];

const js = require("@eslint/js");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const vue = require("eslint-plugin-vue");
const vueParser = require("vue-eslint-parser");
const prettier = require("eslint-config-prettier");
const globals = require("globals");

module.exports = [
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "**/*.config.cjs",
      "tailwind.config.js",
      "postcss.config.cjs",
      "eslint.config.cjs",
      ".eslintrc.cjs"
    ]
  },
  js.configs.recommended,
  ...vue.configs["flat/recommended"],
  prettier,
  {
    files: ["**/*.{ts,vue}"] ,
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        sourceType: "module"
      },
      sourceType: "module",
      globals: globals.browser
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "no-console": "error"
    }
  },
  {
    files: ["tests/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.browser
      }
    }
  }
];

import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "commonjs",
      },
    },
    env: {
      node: true,
      es2021: true,
    },
    plugins: {
      js: pluginJs,
    },
    extends: "eslint:recommended",
    rules: {
      // Add or customize your ESLint rules here
    },
  },
];
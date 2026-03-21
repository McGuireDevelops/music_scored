/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  ignorePatterns: [
    "**/dist/**",
    "**/lib/**",
    "**/node_modules/**",
    "functions/package-lock.json",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: { es2022: true },
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
  overrides: [
    {
      files: ["apps/web/**/*.{ts,tsx}"],
      env: { browser: true },
    },
    {
      files: ["packages/**/*.{ts,tsx}", "functions/**/*.ts"],
      env: { node: true },
    },
  ],
};

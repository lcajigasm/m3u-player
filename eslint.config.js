import security from "eslint-plugin-security";

export default [
  // Global ignores (Flat config)
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "test-results/**",
      "examples/**",
      "assets/**",
      "**/*.html" // HTML files are not linted as JS
    ]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly"
      }
    },
    plugins: {
      security
    },
    rules: {
      "security/detect-unsafe-regex": "warn",
      "security/detect-eval-with-expression": "error",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-non-literal-require": "warn",
      "security/detect-object-injection": "warn",
      "security/detect-child-process": "error"
    }
  }
];

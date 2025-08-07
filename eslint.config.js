import security from "eslint-plugin-security";

export default [
  {
    files: ["**/*.{js,html}"],
    languageOptions: {
      ecmaVersion: 2021,
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

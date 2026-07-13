import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, eslintConfigPrettier],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // TypeScript's own compiler (noUnusedLocals/noUnusedParameters, both on in tsconfig.json)
      // already catches unused vars — this just brings the same check to `npm run lint` and
      // keeps the "prefix with _ to intentionally ignore" convention already used in the codebase
      // (e.g. gameStore.ts's runCommand wrappers).
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // TypeScript itself catches genuinely undefined references; this rule doesn't understand
      // TS-only constructs (ambient types, JSX namespace) and produces false positives on them.
      "no-undef": "off",
    },
  },
  {
    // verify-pacing.mjs — a standalone Playwright script, not part of the tsconfig project.
    files: ["**/*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
  },
);

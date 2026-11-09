import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import ts from "typescript-eslint";

export default ts.config(
  { ignores: ["dist/**"] },
  js.configs.recommended,
  ...ts.configs.recommended,
  reactHooks.configs.flat["recommended-latest"] ?? reactHooks.configs.flat.recommended,
  { languageOptions: { globals: globals.browser } },
);

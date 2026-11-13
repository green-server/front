import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", ".claude"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [js.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Hooks and the menu list that live beside the component they belong to.
      "react-refresh/only-export-components": [
        "error",
        { allowExportNames: ["useServers", "NAV", "useConsultation", "useLive", "useLiveDropped"] },
      ],
    },
  },
  // The entry point renders the app; nothing imports it, so it has nothing to refresh.
  { files: ["src/main.jsx"], rules: { "react-refresh/only-export-components": "off" } },
]);

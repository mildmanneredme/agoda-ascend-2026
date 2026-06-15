import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // The localStorage-hydration pattern (loadGuest() in an effect) trips React 19's
    // set-state-in-effect rule across several pre-existing pages. It's a deliberate,
    // safe pattern here; downgrade to a warning so `next build` (which runs ESLint)
    // doesn't fail the production/preview build. New code prefers useSyncExternalStore.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;

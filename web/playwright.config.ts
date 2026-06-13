import { defineConfig, devices } from "@playwright/test";

/**
 * E2E suite for The Grand Neural sandbox.
 *
 * Two tiers (see e2e/):
 *  - Deterministic tests (onboarding, hub, branding, navigation, journey UI,
 *    processing dots, X-ray panel) — no external dependency; some mock /api/* .
 *  - AI feature tests (e2e/ai-features.spec.ts) — drive the real Gemini-backed
 *    routes end-to-end. These require GEMINI_API_KEY in the dev server's env
 *    (web/.env.local) and are tagged @ai.
 *
 * Run:  npm run test:e2e            (everything)
 *       npm run test:e2e -- --grep-invert @ai   (skip the AI/network tests)
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

import { test, expect } from "@playwright/test";
import { gotoApp, fulfillJson } from "./helpers";

const ROUTES: Array<[string, string]> = [
  ["/apps/offer-builder", "Offer Builder"],
  ["/apps/memory-engine", "Guest Memory"],
  ["/apps/concierge", "AI Concierge"],
  ["/apps/journey", "Journey Assistant"],
  ["/apps/sentiment", "Sentiment Lab"],
  ["/apps/mice", "MICE Co-Pilot"],
  ["/apps/intent", "Intent Engine"],
  ["/property", "The Grand Neural"],
];

test.describe("Navigation", () => {
  // Block real Gemini calls so this stays fast/offline; memory-engine auto-fetches.
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/**", (route) =>
      fulfillJson(route, { preferences: [], actions: [], aspects: [], items: [] })
    );
  });

  for (const [path, marker] of ROUTES) {
    test(`loads ${path}`, async ({ page }) => {
      await gotoApp(page, path);
      await expect(page.getByText(marker).first()).toBeVisible();
      // never bounced back to onboarding
      expect(new URL(page.url()).pathname).toBe(path);
    });
  }

  test("an app page can navigate back to the hub", async ({ page }) => {
    await gotoApp(page, "/apps/sentiment");
    await page.getByRole("link", { name: "Back to hub" }).click();
    await page.waitForURL("**/hub");
    await expect(page.getByRole("heading", { name: /Good to see you/ })).toBeVisible();
  });
});

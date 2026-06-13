import { test, expect } from "@playwright/test";
import { gotoApp } from "./helpers";

const APP_NAMES = [
  "Offer Builder",
  "Guest Memory",
  "AI Concierge",
  "Journey Assistant",
  "Sentiment Lab",
  "MICE Co-Pilot",
  "Intent Engine",
];

test.describe("Hub", () => {
  test("shows the greeting and all seven app cards", async ({ page }) => {
    await gotoApp(page, "/hub");
    await expect(page.getByRole("heading", { name: /Good to see you/ })).toBeVisible();
    for (const name of APP_NAMES) {
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    }
  });

  test("links to every app and the property", async ({ page }) => {
    await gotoApp(page, "/hub");
    const hrefs = [
      "/apps/offer-builder",
      "/apps/memory-engine",
      "/apps/concierge",
      "/apps/journey",
      "/apps/sentiment",
      "/apps/mice",
      "/apps/intent",
      "/property",
    ];
    for (const href of hrefs) {
      await expect(page.locator(`a[href="${href}"]`)).toHaveCount(1);
    }
  });
});

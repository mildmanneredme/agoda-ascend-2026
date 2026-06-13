import { test, expect } from "@playwright/test";
import { gotoApp, JOURNEY_MOCK, fulfillJson } from "./helpers";

test.describe("Look-under-the-hood X-ray panel", () => {
  test("peel corner opens the panel with per-module identity", async ({ page }) => {
    await page.route("**/api/journey", (route) => fulfillJson(route, JOURNEY_MOCK));
    await gotoApp(page, "/apps/journey");

    // produce a trace
    await page.getByRole("button", { name: "Simulate a 3-hour delay" }).click();
    await expect(page.getByRole("button", { name: "Reset the flight" })).toBeVisible();

    // open via the peel corner
    await page.getByLabel(/Peel back the UI/).click();

    // scope to the panel sheet so we don't collide with the page header text
    const panel = page.locator(".glass-deep", { hasText: "How this works" });
    await expect(panel.getByText("Under the hood", { exact: false })).toBeVisible();
    await expect(panel.getByText("Journey Assistant")).toBeVisible();
    await expect(panel.getByText("Already Handled")).toBeVisible();
    await expect(panel.getByText("How this works")).toBeVisible();
    // the signature agent is highlighted as the entry point
    await expect(panel.getByText("entry point").first()).toBeVisible();
    await expect(panel.getByText("Journey Ops")).toBeVisible();
  });

  test("the empty panel lists the agents on call", async ({ page }) => {
    await gotoApp(page, "/hub");
    await page.getByLabel(/Peel back the UI/).click();
    const panel = page.locator(".glass-deep", { hasText: "The agents on call" });
    await expect(panel.getByText("The agents on call")).toBeVisible();
    await expect(panel.getByText("Guest Memory")).toBeVisible();
  });
});

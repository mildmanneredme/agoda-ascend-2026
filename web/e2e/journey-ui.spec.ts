import { test, expect } from "@playwright/test";
import { gotoApp, JOURNEY_MOCK, fulfillJson } from "./helpers";

test.describe("Journey Assistant — two-button UI", () => {
  test("shows two white action buttons, not a tab toggle", async ({ page }) => {
    await gotoApp(page, "/apps/journey");

    await expect(page.getByRole("button", { name: "Simulate a 3-hour delay" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Simulate a flight cancellation" })).toBeVisible();

    // the old toggle tabs ("3-hour delay" / "Flight cancelled") are gone
    await expect(page.getByRole("button", { name: "3-hour delay", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Flight cancelled", exact: true })).toHaveCount(0);
  });

  test("each button drives its own scenario (mocked)", async ({ page }) => {
    await page.route("**/api/journey", (route) => fulfillJson(route, JOURNEY_MOCK));
    await gotoApp(page, "/apps/journey");

    // cancellation path
    await page.getByRole("button", { name: "Simulate a flight cancellation" }).click();
    await expect(page.getByText("Cancelled")).toBeVisible();
    await expect(page.getByText("Rebooked tomorrow")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset the flight" })).toBeVisible();

    // reset and run the delay path
    await page.getByRole("button", { name: "Reset the flight" }).click();
    await page.getByRole("button", { name: "Simulate a 3-hour delay" }).click();
    await expect(page.getByText("Delayed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset the flight" })).toBeVisible();
  });
});

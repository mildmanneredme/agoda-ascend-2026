import { test, expect } from "@playwright/test";
import { gotoApp, JOURNEY_MOCK, fulfillJson } from "./helpers";

test.describe("Branding & the requested changes", () => {
  test("official Ascend logo appears top-left on the landing page", async ({ page }) => {
    await page.goto("/");
    const logo = page.getByAltText("Agoda Ascend");
    await expect(logo).toBeVisible();
    // it really loaded (decoded with a non-zero intrinsic width)
    await expect
      .poll(() => logo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  });

  test("official Ascend logo appears top-left on the hub", async ({ page }) => {
    await gotoApp(page, "/hub");
    await expect(page.getByAltText("Agoda Ascend").first()).toBeVisible();
  });

  test("the 'Explore the property' tile no longer shimmers (no foil)", async ({ page }) => {
    await gotoApp(page, "/hub");
    const tile = page.locator('a[href="/property"]');
    await expect(tile).toBeVisible();
    await expect(tile).toContainText("Explore the property");
    const cls = (await tile.getAttribute("class")) ?? "";
    expect(cls).not.toContain("foil");
  });

  test("processing dots render the full 5-colour agoda palette", async ({ page }) => {
    // hold the journey loading state open so the dots stay mounted
    await page.route("**/api/journey", (route) => fulfillJson(route, JOURNEY_MOCK, 3000));
    await gotoApp(page, "/apps/journey");
    await page.getByRole("button", { name: "Simulate a 3-hour delay" }).click();

    const dots = page.locator(".thinking-dots").first();
    await expect(dots).toBeVisible();
    await expect(dots.locator("span")).toHaveCount(5);

    // and they are coloured from the official palette (first dot = agoda red)
    const firstColor = await dots
      .locator("span")
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(firstColor).toBe("rgb(234, 66, 66)"); // --agoda-red #ea4242
  });
});

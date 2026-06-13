import { test, expect } from "@playwright/test";

test.describe("Onboarding", () => {
  test("landing renders the welcome hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Agoda Ascend 2026 presents")).toBeVisible();
    await expect(page.getByRole("button", { name: "Welcome to the Neural" })).toBeVisible();
  });

  test("picking a persona seeds a guest and lands on the hub", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Welcome to the Neural" }).click();

    // gallery of preset travelers
    await expect(page.getByText("Who are you today?")).toBeVisible();
    // pick the first persona card
    await page.locator("button.glass-deep").first().click();

    // the sync animation runs, then routes to the hub
    await page.waitForURL("**/hub", { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Good to see you/ })).toBeVisible();
  });

  test('the custom "be yourself" path checks a guest in', async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Welcome to the Neural" }).click();
    await page.getByRole("button", { name: /be yourself/ }).click();

    await page.getByPlaceholder("Your first name").fill("Taylor");
    await page.getByRole("button", { name: "Next", exact: true }).click();

    await expect(page.getByText(/how do you travel/)).toBeVisible();
    await page.getByRole("button", { name: /business/ }).click();
    await page.getByRole("button", { name: "Check me in" }).click();

    await page.waitForURL("**/hub", { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Taylor/ })).toBeVisible();
  });
});

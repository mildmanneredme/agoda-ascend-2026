import { test, expect, type Page } from "@playwright/test";
import { gotoApp, seedGuest } from "./helpers";

/**
 * End-to-end exercise of every AI feature against the REAL Gemini-backed routes.
 * Requires GEMINI_API_KEY in the dev server's env (web/.env.local).
 * Tagged @ai — skip with:  npm run test:e2e -- --grep-invert @ai
 */

function waitForPost(page: Page, fragment: string) {
  // Gemini calls can be slow; allow well past waitForResponse's 30s default.
  return page.waitForResponse(
    (r) => r.url().includes(fragment) && r.request().method() === "POST",
    { timeout: 75_000 }
  );
}

test.describe("AI features (live Gemini) @ai", () => {
  // live model calls can be transiently slow / rate-limited — allow one retry
  test.describe.configure({ retries: 1 });

  test("offer-builder composes a personalised bundle", async ({ page }) => {
    await gotoApp(page, "/apps/offer-builder");
    await page.getByRole("button", { name: /Search hotels/ }).click();
    const build = page.getByRole("button", { name: /Build my offer/ });
    await expect(build).toBeVisible();
    const [resp] = await Promise.all([waitForPost(page, "/api/offer"), build.click()]);
    expect(resp.status()).toBe(200);
    await expect(page.getByText(/Composed for/)).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText("The booking engine hiccuped")).toHaveCount(0);
  });

  test("memory-engine auto-infers preferences on load", async ({ page }) => {
    await seedGuest(page);
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/memory"), { timeout: 75_000 }),
      page.goto("/apps/memory-engine"),
    ]);
    expect(resp.status()).toBe(200);
    await expect(page.getByText("What we've learned")).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText("The memory engine hiccuped")).toHaveCount(0);
  });

  test("concierge answers a message", async ({ page }) => {
    await gotoApp(page, "/apps/concierge");
    const [resp] = await Promise.all([
      waitForPost(page, "/api/concierge"),
      page.getByRole("button", { name: /Where should I eat tonight/ }).click(),
    ]);
    expect(resp.status()).toBe(200);
    await expect(page.getByText("I lost the thread for a second")).toHaveCount(0);
  });

  test("sentiment decomposes a review into tasks", async ({ page }) => {
    await gotoApp(page, "/apps/sentiment");
    await page.getByRole("button", { name: "Glowing", exact: true }).click();
    const [resp] = await Promise.all([
      waitForPost(page, "/api/sentiment"),
      page.getByRole("button", { name: /Decompose into actions/ }).click(),
    ]);
    expect(resp.status()).toBe(200);
    await expect(page.getByText("Overall sentiment")).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText("Dispatched to teams")).toBeVisible();
    await expect(page.getByText("The analysis engine hiccuped")).toHaveCount(0);
  });

  test("mice co-pilot responds to an RFP", async ({ page }) => {
    await gotoApp(page, "/apps/mice");
    await page.getByRole("button", { name: "Board offsite", exact: true }).click();
    const [resp] = await Promise.all([
      waitForPost(page, "/api/mice"),
      page.getByRole("button", { name: /Ask the co-pilot/ }).click(),
    ]);
    expect(resp.status()).toBe(200);
    await expect(page.getByText("The events desk hiccuped")).toHaveCount(0);
  });

  test("intent engine understands a non-English message", async ({ page }) => {
    await gotoApp(page, "/apps/intent");
    await page.getByRole("button", { name: /ไทย/ }).click();
    const [resp] = await Promise.all([
      waitForPost(page, "/api/intent"),
      page.getByRole("button", { name: /Understand & respond/ }).click(),
    ]);
    expect(resp.status()).toBe(200);
    await expect(page.getByText(/Reply · in their language/)).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText("The language engine hiccuped")).toHaveCount(0);
  });

  test("journey assistant handles a delay", async ({ page }) => {
    await gotoApp(page, "/apps/journey");
    const [resp] = await Promise.all([
      waitForPost(page, "/api/journey"),
      page.getByRole("button", { name: "Simulate a 3-hour delay" }).click(),
    ]);
    expect(resp.status()).toBe(200);
    await expect(page.getByRole("button", { name: "Reset the flight" })).toBeVisible({
      timeout: 40_000,
    });
    await expect(page.getByText("The journey desk hiccuped")).toHaveCount(0);
  });
});

import { type Page, type Route } from "@playwright/test";

/**
 * Seed a checked-in guest into localStorage before the app boots, so app pages
 * don't redirect to the onboarding flow. Mirrors the shape saved by
 * src/lib/guest.ts (key "gn.guest").
 */
export async function seedGuest(page: Page, name = "John") {
  await page.addInitScript((guestName) => {
    localStorage.setItem(
      "gn.guest",
      JSON.stringify({
        name: guestName,
        styleId: "business",
        createdAt: new Date("2026-06-01T00:00:00.000Z").toISOString(),
      })
    );
    // skip the one-time peel-corner hint so it doesn't animate during tests
    localStorage.setItem("peel-hinted", "1");
  }, name);
}

/** Seed the guest, then navigate to an app route. */
export async function gotoApp(page: Page, path: string, name = "John") {
  await seedGuest(page, name);
  await page.goto(path);
}

/**
 * A minimal, valid /api/journey response so tests can exercise the journey
 * client flow without hitting Gemini. Shape matches the Plan type in the page.
 */
export const JOURNEY_MOCK = {
  headline: "Handled before you asked",
  summary: "Your delay is covered — room held, transfer rebooked.",
  actions: [
    { kind: "dayroom", title: "Room held till 2am", detail: "No checkout pressure.", timing: "Now" },
    { kind: "transfer", title: "Airport transfer pushed +3h", detail: "Driver re-timed.", timing: "Auto" },
  ],
  _debug: { prompt: "(mock prompt)", rawResponse: "{}", model: "mock-model", latencyMs: 1234 },
};

/** Fulfill a route with JSON, optionally after a delay (to hold a loading state). */
export async function fulfillJson(route: Route, body: unknown, delayMs = 0) {
  if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

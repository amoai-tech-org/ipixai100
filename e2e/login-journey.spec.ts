import { test, expect } from "@playwright/test";

import { signInAsE2ETestOperator } from "./support/login";

/**
 * The one deliberate extra UI login in the suite, beyond auth.setup.ts —
 * proves the real login form end-to-end rather than only reusing a saved
 * cookie. Restricted to the "chromium" project only (see mobile-chromium's
 * `testIgnore` in playwright.config.ts) so the hosted account is signed
 * into exactly twice per full run (setup + this), not once per viewport.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test("critical journey: login succeeds", async ({ page }) => {
  await signInAsE2ETestOperator(page);
  // Explicit here (not just inside the shared helper) — this is the
  // public, user-observable proof that password sign-in lands the
  // operator on /app, not an internal implementation detail.
  await expect(page).toHaveURL(/\/app$/);
});

// PR #52 (IPI-1066) merged — /app is the real Command Center now.
test(
  "critical journey: dashboard → brand navigation",
  async ({ page }) => {
    await signInAsE2ETestOperator(page);

    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.getByRole("link", { name: "Open Brands" }).click();
    await expect(page).toHaveURL(/\/app\/brands$/);
  },
);

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
});

// Blocked on https://github.com/amoai-tech/ipixai/pull/52 (IPI-1066) — /app on
// main is still the pre-Command-Center placeholder. Remove `.fixme` once that
// merges; the assertions below are the real, intended behavior, not a stub.
test.fixme(
  "critical journey: dashboard → brand navigation",
  async ({ page }) => {
    await signInAsE2ETestOperator(page);

    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.getByRole("link", { name: "Open Brands" }).click();
    await expect(page).toHaveURL(/\/app\/brands$/);
  },
);

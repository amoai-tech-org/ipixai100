import { test, expect } from "@playwright/test";

/**
 * The E2E account (test@ipix.co) belongs to org "QA iPix Isolation A" only,
 * which has exactly 0 brands (verified read-only against the hosted DB) —
 * that is the real, deterministic ground truth this file checks against,
 * not a fixture. A dedicated "QA iPix Isolation B" org + user
 * (qa-ipix-isolation-b@ipix.test) already exist in the database for
 * two-account isolation testing, but no credentials for it are provided via
 * .env.test — see the skipped reciprocal test below.
 */

// Blocked on https://github.com/amoai-tech/ipixai/pull/52 (IPI-1066) — /app
// on main has no "Dashboard" heading or brand list yet.
test.fixme("dashboard never shows another organization's brands", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // Primary, robust assertion: org A's real brand count is 0, so the brand
  // list must render nothing at all — this holds regardless of what other
  // orgs' data looks like today, unlike matching specific brand names.
  await expect(page.getByTestId("command-center-brand-list")).toHaveCount(0);

  // Defense in depth: these 3 brand names are confirmed (read-only) to
  // belong to other organizations right now. This is a secondary check,
  // not the primary isolation proof above — if any of these are renamed or
  // deleted, the count-based assertion still catches a real regression.
  const otherOrgBrandNames = [
    "majji",
    "QA Test Brand — IPI-404 parity check",
    "IPI-370 Smoke Co 1784673279581",
  ];
  for (const name of otherOrgBrandNames) {
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  }
});

/**
 * Real reciprocal cross-account proof — activate once credentials exist:
 *
 * 1. Add E2E_TEST_EMAIL_ORG_B / E2E_TEST_PASSWORD_ORG_B to .env.test (and as
 *    CI secrets) for qa-ipix-isolation-b@ipix.test.
 * 2. Add a second setup test (e.g. e2e/auth-org-b.setup.ts, mirroring
 *    auth.setup.ts) that saves a separate storageState, e.g.
 *    playwright/.auth/user-org-b.json.
 * 3. Give each org a known brand so both directions have a positive
 *    ownership check, not just an absence check:
 *      Org A → asserts its own known brand IS visible, Org B's is NOT.
 *      Org B → asserts its own known brand IS visible, Org A's is NOT.
 * 4. Remove `.skip` below and delete the placeholder body.
 */
test.skip("org A vs org B: signed-in dashboards never cross-show brands", async () => {
  // See doc comment above for the exact activation steps.
});

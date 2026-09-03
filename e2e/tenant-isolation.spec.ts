import { test, expect } from "@playwright/test";

/**
 * The E2E account (test@ipix.co) belongs to org "QA iPix Isolation A" only.
 * A dedicated "QA iPix Isolation B" org + user (qa-ipix-isolation-b@ipix.test)
 * already exist in the database for two-account isolation testing, but no
 * credentials for it are provided via .env.test — see the skipped test below.
 */

// Real brand names confirmed (read-only) to belong to other organizations —
// not fixtures. If any of these ever render on the QA-A dashboard, org
// scoping in loadOrgBrands (src/lib/dashboard/command-center.ts) is broken.
const OTHER_ORG_BRAND_NAMES = [
  "majji",
  "QA Test Brand — IPI-404 parity check",
  "IPI-370 Smoke Co 1784673279581",
];

test("dashboard never shows another organization's brands", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  for (const name of OTHER_ORG_BRAND_NAMES) {
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  }
});

test.skip(
  "org A vs org B: signed-in dashboards never cross-show brands",
  async () => {
    // Requires a second credential pair for qa-ipix-isolation-b@ipix.test —
    // add E2E_TEST_EMAIL_ORG_B / E2E_TEST_PASSWORD_ORG_B to .env.test and a
    // second `setup`-style auth file (see e2e/auth.setup.ts) to enable this.
  },
);

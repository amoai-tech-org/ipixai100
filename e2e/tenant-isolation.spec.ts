import { test, expect, type Page } from "@playwright/test";

/**
 * usera@ipix.co and userb@ipix.co are dedicated QA users in separate,
 * isolated organizations. Both orgs intentionally have 0 brands, so any
 * rendered brand is a tenant leak. Credentials stay in .env.test / CI
 * secrets and each account gets its own Playwright storageState.
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
  for (const name of otherOrgBrandNames) {
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  }
});

const otherOrgBrandNames = [
  "majji",
  "QA Test Brand — IPI-404 parity check",
  "IPI-370 Smoke Co 1784673279581",
];

async function expectEmptyIsolatedDashboard(page: Page) {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByTestId("command-center-brand-list")).toHaveCount(0);
  for (const name of otherOrgBrandNames) {
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  }
}

test("org A vs org B: signed-in dashboards remain tenant-isolated", async ({ browser, page }) => {
  await expectEmptyIsolatedDashboard(page);

  const orgB = await browser.newContext({
    storageState: "playwright/.auth/user-org-b.json",
  });
  try {
    const orgBPage = await orgB.newPage();
    await expectEmptyIsolatedDashboard(orgBPage);
  } finally {
    await orgB.close();
  }
});

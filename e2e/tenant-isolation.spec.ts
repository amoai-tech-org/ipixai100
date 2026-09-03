import { test, expect, type Page } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";

/**
 * usera@ipix.co and userb@ipix.co are dedicated QA users in separate,
 * isolated organizations. Both orgs intentionally have 0 brands, so any
 * rendered brand is a tenant leak. Credentials stay in .env.test / CI
 * secrets and each account gets its own Playwright storageState.
 */

const otherOrgBrandNames = [
  "majji",
  "QA Test Brand — IPI-404 parity check",
  "IPI-370 Smoke Co 1784673279581",
];

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are missing",
    );
  }
  return { url, key };
}

async function supabaseForPage(page: Page) {
  const { url, key } = supabaseConfig();
  const cookies = await page.context().cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookies.map(({ name, value }) => ({ name, value })),
      // These are short read-only probes; src/proxy.ts owns session refresh.
      setAll: () => {},
    },
  });
}

/**
 * Read-only (SELECT only, RLS-enforced): the org this session's own
 * membership row belongs to — the "known record" every signed-in operator
 * can read about themselves, whether or not their org has any brands yet.
 */
async function getOwnOrgId(page: Page): Promise<string> {
  const supabase = await supabaseForPage(page);
  const { data: rows, error } = await supabase.from("org_members").select("org_id");
  expect(error, `org_members read failed: ${error?.message ?? "unknown"}`).toBeNull();
  expect(rows, "expected exactly one org membership row for this QA session").toHaveLength(1);
  return rows![0].org_id;
}

/** Read-only negative check: RLS must return zero rows, not leak another
 *  organization's membership row, when a session queries for it directly. */
async function assertCannotReadOtherOrg(page: Page, otherOrgId: string) {
  const supabase = await supabaseForPage(page);
  const { data: rows, error } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", otherOrgId);
  expect(error, `cross-org read failed unexpectedly: ${error?.message ?? "unknown"}`).toBeNull();
  expect(rows, "RLS leak: this session can read another organization's membership row").toHaveLength(0);
}

async function expectEmptyIsolatedDashboard(page: Page) {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  // Primary, robust assertion: this org's real brand count is 0, so the
  // brand list must render nothing at all — this holds regardless of what
  // any other org's data looks like today, unlike matching specific names.
  await expect(page.getByTestId("command-center-brand-list")).toHaveCount(0);
  // Defense in depth: these 3 brand names are confirmed (read-only) to
  // belong to other organizations right now. Secondary check, not the
  // primary isolation proof above — if any of these are renamed or
  // deleted, the count-based assertion still catches a real regression.
  for (const name of otherOrgBrandNames) {
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  }
}

// Blocked on https://github.com/amoai-tech/ipixai/pull/52 (IPI-1066) — /app
// on main has no "Dashboard" heading or brand list yet. Remove `.fixme` once
// that merges — the assertions below are the real, intended two-account
// reciprocal proof, not a stub.
test.fixme(
  "org A vs org B: signed-in dashboards remain tenant-isolated",
  async ({ browser, page }) => {
    const orgAId = await getOwnOrgId(page);

    const orgB = await browser.newContext({
      storageState: "playwright/.auth/user-org-b.json",
    });
    try {
      const orgBPage = await orgB.newPage();
      const orgBId = await getOwnOrgId(orgBPage);

      expect(orgAId, "Org A and Org B sessions must belong to different organizations").not.toBe(
        orgBId,
      );

      // Each session can read its own org membership (above) but is denied
      // the other's — proven in both directions, not just B-cannot-read-A.
      await assertCannotReadOtherOrg(page, orgBId);
      await assertCannotReadOtherOrg(orgBPage, orgAId);

      await expectEmptyIsolatedDashboard(page);
      await expectEmptyIsolatedDashboard(orgBPage);
    } finally {
      await orgB.close();
    }
  },
);

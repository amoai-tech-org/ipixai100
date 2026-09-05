import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";

/**
 * Read-only Supabase access scoped to an authenticated Playwright page's own
 * session cookies (RLS-enforced, same as the real app) — shared by
 * tenant-isolation.spec.ts (cross-org leak proofs) and dashboard.spec.ts
 * (deterministic preconditions), so neither duplicates this wiring.
 */

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are missing");
  }
  return { url, key };
}

export async function supabaseForPage(page: Page) {
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
 * The org this session's own membership row belongs to — the "known
 * record" every signed-in operator can read about themselves, whether or
 * not their org has any brands yet. Asserting exactly one row is what
 * makes this "the expected organization", not just "some organization".
 */
export async function getOwnOrgId(page: Page): Promise<string> {
  const supabase = await supabaseForPage(page);
  const { data: rows, error } = await supabase.from("org_members").select("org_id");
  expect(error, `org_members read failed: ${error?.message ?? "unknown"}`).toBeNull();
  expect(rows, "expected exactly one org membership row for this QA session").toHaveLength(1);
  return rows![0].org_id;
}

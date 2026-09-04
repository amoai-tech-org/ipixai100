import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardBrand = {
  id: string;
  name: string;
};

export type DashboardShoot = {
  id: string;
  name: string;
  status: string | null;
};

const BRAND_LIMIT = 6;
const SHOOT_LIMIT = 6;
// Safety ceiling on the org's own brand id list used to scope Shoots — not a
// display cap (that's BRAND_LIMIT). RLS + the org_id filter already bound
// this to one org's real brands; this just guards against an unbounded read.
const TRUSTED_BRAND_ID_CEILING = 500;

/**
 * DASH-MAIN-001: org-scoped brand read for the Command Center.
 *
 * `orgId` must already be the AUTH-002 trusted org (never a client-supplied
 * value) — RLS on `public.brands` is defense in depth, not the only guard.
 *
 * Typed with the real Supabase client (no generated `Database` type exists
 * in this repo yet, so `.from()` stays loosely typed regardless — that's an
 * acknowledged gap, not one this function should hide behind a shadow
 * interface). The one cast below is on the query *result* shape, not the
 * client.
 */
export async function loadOrgBrands(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ ok: true; brands: DashboardBrand[] } | { ok: false }> {
  try {
    const { data, error } = await supabase
      .from("brands")
      .select("id,name")
      .eq("org_id", orgId)
      // `id` is a stable tie-breaker so brands sharing a created_at
      // timestamp return in a deterministic order across requests.
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(BRAND_LIMIT);
    if (error || !data) {
      console.error("dashboard.loadOrgBrands: query failed", { orgId, error });
      return { ok: false };
    }
    const rows = data as { id: string; name: string | null }[];
    return {
      ok: true,
      brands: rows.map((row) => ({ id: row.id, name: row.name ?? "Untitled brand" })),
    };
  } catch (err) {
    console.error("dashboard.loadOrgBrands: threw", { orgId, err });
    return { ok: false };
  }
}

/**
 * DASH-MAIN-001: every trusted-org brand id (uncapped, unlike the display
 * list `loadOrgBrands` returns), so Shoots can be scoped to the org's full
 * brand set — not just the 6 cards shown on the dashboard.
 */
export async function loadTrustedBrandIds(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ ok: true; brandIds: string[] } | { ok: false }> {
  try {
    const { data, error } = await supabase
      .from("brands")
      .select("id")
      .eq("org_id", orgId)
      .limit(TRUSTED_BRAND_ID_CEILING);
    if (error || !data) {
      console.error("dashboard.loadTrustedBrandIds: query failed", { orgId, error });
      return { ok: false };
    }
    const rows = data as { id: string }[];
    return { ok: true, brandIds: rows.map((row) => row.id) };
  } catch (err) {
    console.error("dashboard.loadTrustedBrandIds: threw", { orgId, err });
    return { ok: false };
  }
}

/**
 * DASH-MAIN-001: recent-shoots read for the Command Center.
 *
 * Reads `public.shoot_portfolio_view` (security_invoker=true, PostgREST-
 * exposed), NOT raw `shoot.shoots` — that table's RLS is membership-union
 * (every org the caller belongs to), not active-org scoped, so relying on
 * it alone would leak a multi-org user's other orgs' shoots. The explicit
 * `.in("brand_id", trustedBrandIds)` filter — brand ids already scoped to
 * the trusted org via `loadTrustedBrandIds` — is the real isolation
 * boundary here; view RLS is defense in depth.
 *
 * `brandIds` empty (org has no brands yet) short-circuits to an honest
 * empty result without a query — an `.in()` with an empty array is either
 * a wasted round-trip or a backend-specific edge case, not the same thing
 * as "org has brands but no shoots".
 */
export async function loadOrgShoots(
  supabase: SupabaseClient,
  brandIds: string[],
): Promise<{ ok: true; shoots: DashboardShoot[] } | { ok: false }> {
  if (brandIds.length === 0) {
    return { ok: true, shoots: [] };
  }
  try {
    const { data, error } = await supabase
      .from("shoot_portfolio_view")
      .select("id,name,status,brand_id")
      .in("brand_id", brandIds)
      // Same deterministic-order contract as loadOrgBrands: most-recently-
      // updated first, id as a stable tie-breaker.
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(SHOOT_LIMIT);
    if (error || !data) {
      console.error("dashboard.loadOrgShoots: query failed", { error });
      return { ok: false };
    }
    const rows = data as { id: string; name: string | null; status: string | null }[];
    return {
      ok: true,
      shoots: rows.map((row) => ({
        id: row.id,
        name: row.name ?? "Untitled shoot",
        status: row.status,
      })),
    };
  } catch (err) {
    console.error("dashboard.loadOrgShoots: threw", { err });
    return { ok: false };
  }
}

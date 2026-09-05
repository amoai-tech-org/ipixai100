import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardBrand = {
  id: string;
  name: string;
};

export type DashboardShoot = {
  id: string;
  name: string;
  status: string | null;
  /** Owning brand id. Shoots load org-wide (not scoped to one brand), so
   *  this is what lets the hero match a shoot to *its own* brand instead of
   *  showing another brand's most recent shoot under the wrong hero. */
  brandId: string;
  /** Real DNA score (0-100), when scored. Never fabricated. */
  dnaScore: number | null;
  /** First target channel, when set — used for the "IG · 4:5"-style meta
   *  line. No invented channel. */
  channel: string | null;
};

/**
 * DASH-MAIN-002: pure hero-greeting logic (COPY+CLEAN of Lumina's
 * buildHeroGreeting concept, ADAPTed — no fabricated fallback like Lumina's
 * "generate IG deliverables for your active campaign" when nothing real is
 * known). No approval-count branch: no real source exists yet, and the
 * owning task hasn't shipped it —
 * IPI-1084 · APPROVAL-001 — Let Operators Review, Edit, Approve, or Reject
 * AI Plans Before Anything Is Saved
 * Add that branch back only once a real pending-approval count can be
 * supplied; a parameter every caller passes as `0` is speculative, not
 * currently-supported behavior.
 */
export function buildHeroGreeting(input: {
  brandName: string;
  recentShootName?: string | null;
}): { headline: string; subline: string } {
  const { brandName, recentShootName } = input;
  const headline = `You're working with ${brandName}.`;

  if (recentShootName) {
    return { headline, subline: `Continue planning ${recentShootName}.` };
  }
  return { headline, subline: "Ask the Production Planner what to work on next." };
}

const BRAND_LIMIT = 6;
const SHOOT_LIMIT = 6;
// Page size for the org's own brand id list used to scope Shoots — not a
// display cap (that's BRAND_LIMIT). Paginated rather than a single capped
// read: silently truncating would under-scope Shoots for an org with more
// brands than one page, excluding real shoots from "Recent shoots" with no
// error surfaced.
const TRUSTED_BRAND_ID_PAGE_SIZE = 500;
// Sanity ceiling on total pages so a corrupt/unbounded result set can't spin
// this loop forever — 50 pages * 500 is far beyond any real org's brand
// count. Hitting it is treated as a failure, not a silent partial result.
const TRUSTED_BRAND_ID_MAX_PAGES = 50;

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
 *
 * Paginates in pages of `TRUSTED_BRAND_ID_PAGE_SIZE` rather than a single
 * `.limit()` read: a single capped read silently drops brands beyond the
 * cap, and `loadOrgShoots` would then under-scope Shoots for that org with
 * no error surfaced. Returns `ok: false` — never a partial list — if the
 * org's brand count exceeds what `TRUSTED_BRAND_ID_MAX_PAGES` pages can
 * hold; that ceiling exists only to bound the loop, not as a soft cap.
 */
export async function loadTrustedBrandIds(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ ok: true; brandIds: string[] } | { ok: false }> {
  const brandIds: string[] = [];
  try {
    for (let page = 0; page < TRUSTED_BRAND_ID_MAX_PAGES; page++) {
      const from = page * TRUSTED_BRAND_ID_PAGE_SIZE;
      const to = from + TRUSTED_BRAND_ID_PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("brands")
        .select("id")
        .eq("org_id", orgId)
        .range(from, to);
      if (error || !data) {
        console.error("dashboard.loadTrustedBrandIds: query failed", { orgId, page, error });
        return { ok: false };
      }
      const rows = data as { id: string }[];
      brandIds.push(...rows.map((row) => row.id));
      if (rows.length < TRUSTED_BRAND_ID_PAGE_SIZE) {
        return { ok: true, brandIds };
      }
    }
    console.error("dashboard.loadTrustedBrandIds: exceeded max pages, refusing a partial scope", {
      orgId,
      pages: TRUSTED_BRAND_ID_MAX_PAGES,
    });
    return { ok: false };
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
 *
 * Deliberately NOT selecting `cover_url`: the view resolves it from
 * `shoot.shoots.mood_board_urls[1]`, a plain URL with no bridge to this
 * app's one proven secure-delivery contract (signed `type: authenticated`
 * Cloudinary assets via `cloudinary_assets` + get-authorized-asset-preview.ts
 * — mood_board_urls entries aren't tracked in that mirror table at all).
 * Rendering it directly would be an unproven, possibly-broken, possibly
 * cross-org-leakable path. Wire this once
 * IPI-1112 · CLD-DELIVERY-001 — Serve Org-Safe Cloudinary Previews with
 * Named Transforms ships a real signed-preview route for it; until then the
 * UI shows an honest no-image placeholder for every shoot, same as when a
 * real cover genuinely doesn't exist.
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
      .select("id,name,status,brand_id,dna_score,target_channels")
      .in("brand_id", brandIds)
      // Same deterministic-order contract as loadOrgBrands: most-recently-
      // updated first, id as a stable tie-breaker. `updated_at` orders the
      // result without needing to be in the select list (PostgREST/SQL
      // ORDER BY isn't limited to selected columns) — it isn't rendered.
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(SHOOT_LIMIT);
    if (error || !data) {
      console.error("dashboard.loadOrgShoots: query failed", { error });
      return { ok: false };
    }
    const rows = data as {
      id: string;
      name: string | null;
      status: string | null;
      brand_id: string;
      dna_score: number | null;
      target_channels: string[] | null;
    }[];
    return {
      ok: true,
      shoots: rows.map((row) => ({
        id: row.id,
        name: row.name ?? "Untitled shoot",
        status: row.status,
        brandId: row.brand_id,
        dnaScore: row.dna_score ?? null,
        channel: row.target_channels?.[0] ?? null,
      })),
    };
  } catch (err) {
    console.error("dashboard.loadOrgShoots: threw", { err });
    return { ok: false };
  }
}

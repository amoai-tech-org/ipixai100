export type DashboardBrand = {
  id: string;
  name: string;
};

const BRAND_LIMIT = 6;

type OrderBuilder = {
  order: (column: string, opts: { ascending: boolean }) => OrderBuilder;
  limit: (n: number) => PromiseLike<{
    data: { id: string; name: string | null }[] | null;
    error: unknown;
  }>;
};

type BrandsClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => OrderBuilder;
    };
  };
};

/**
 * DASH-MAIN-001: org-scoped brand read for the Command Center.
 *
 * `orgId` must already be the AUTH-002 trusted org (never a client-supplied
 * value) — RLS on `public.brands` is defense in depth, not the only guard.
 *
 * `unknown` + a local structural type (not the generated Supabase client
 * type — this repo has no generated `Database` type yet) matches the
 * existing pattern in `src/lib/cloudinary/ownership.ts`.
 */
export async function loadOrgBrands(
  supabase: unknown,
  orgId: string,
): Promise<{ ok: true; brands: DashboardBrand[] } | { ok: false }> {
  const client = supabase as BrandsClient;
  try {
    const { data, error } = await client
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
    return {
      ok: true,
      brands: data.map((row) => ({ id: row.id, name: row.name ?? "Untitled brand" })),
    };
  } catch (err) {
    console.error("dashboard.loadOrgBrands: threw", { orgId, err });
    return { ok: false };
  }
}

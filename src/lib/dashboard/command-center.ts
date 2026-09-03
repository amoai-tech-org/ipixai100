export type DashboardBrand = {
  id: string;
  name: string;
};

const BRAND_LIMIT = 6;

type BrandsClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        order: (
          column: string,
          opts: { ascending: boolean },
        ) => {
          limit: (n: number) => PromiseLike<{
            data: { id: string; name: string | null }[] | null;
            error: unknown;
          }>;
        };
      };
    };
  };
};

/**
 * DASH-MAIN-001: org-scoped brand read for the Command Center.
 *
 * `orgId` must already be the AUTH-002 trusted org (never a client-supplied
 * value) — RLS on `public.brands` is defense in depth, not the only guard.
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
      .order("created_at", { ascending: false })
      .limit(BRAND_LIMIT);
    if (error || !data) return { ok: false };
    return {
      ok: true,
      brands: data.map((row) => ({ id: row.id, name: row.name ?? "Untitled brand" })),
    };
  } catch {
    return { ok: false };
  }
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

type BrandLookupClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        eq: (
          column: string,
          value: string,
        ) => {
          maybeSingle: () => PromiseLike<{
            data: { id: string } | null;
            error: unknown;
          }>;
        };
      };
    };
  };
};

type ShootLookupClient = {
  schema: (name: string) => {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string,
        ) => {
          eq: (
            column: string,
            value: string,
          ) => {
            maybeSingle: () => PromiseLike<{
              data: { id: string } | null;
              error: unknown;
            }>;
          };
        };
      };
    };
  };
};

/** Brand must belong to the trusted org (never trust body.orgId). */
export async function assertBrandOwnedByOrg(
  supabase: unknown,
  input: { brandId: string; orgId: string },
): Promise<"ok" | "forbidden" | "lookup_failed"> {
  if (!isUuid(input.brandId) || !isUuid(input.orgId)) return "forbidden";
  const client = supabase as BrandLookupClient;
  try {
    const { data, error } = await client
      .from("brands")
      .select("id")
      .eq("id", input.brandId)
      .eq("org_id", input.orgId)
      .maybeSingle();
    if (error) return "lookup_failed";
    return data?.id ? "ok" : "forbidden";
  } catch {
    return "lookup_failed";
  }
}

/** Optional V2 shoot must belong to the already-proven brand. */
export async function assertV2ShootOwnedByBrand(
  supabase: unknown,
  input: { v2ShootId: string; brandId: string },
): Promise<"ok" | "forbidden" | "lookup_failed"> {
  if (!isUuid(input.v2ShootId) || !isUuid(input.brandId)) return "forbidden";
  const client = supabase as ShootLookupClient;
  try {
    const { data, error } = await client
      .schema("shoot")
      .from("shoots")
      .select("id")
      .eq("id", input.v2ShootId)
      .eq("brand_id", input.brandId)
      .maybeSingle();
    if (error) return "lookup_failed";
    return data?.id ? "ok" : "forbidden";
  } catch {
    return "lookup_failed";
  }
}

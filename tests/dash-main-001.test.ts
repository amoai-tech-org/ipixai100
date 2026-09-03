import { describe, expect, it } from "vitest";

import { loadOrgBrands } from "@/lib/dashboard/command-center";

const ORG_A = "aaaaaaaa-0000-4000-8000-000000000001";
const ORG_B = "bbbbbbbb-0000-4000-8000-000000000002";

/** Mimics supabase-js chained builder, scoped by the `eq("org_id", …)` call. */
function fakeSupabase(rowsByOrg: Record<string, { id: string; name: string }[]>) {
  return {
    from(table: string) {
      expect(table).toBe("brands");
      return {
        select() {
          return {
            eq(column: string, value: string) {
              expect(column).toBe("org_id");
              return {
                order() {
                  return {
                    limit(n: number) {
                      return Promise.resolve({
                        data: (rowsByOrg[value] ?? []).slice(0, n),
                        error: null,
                      });
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

describe("loadOrgBrands", () => {
  it("returns only the trusted org's brands, never another org's", async () => {
    const supabase = fakeSupabase({
      [ORG_A]: [{ id: "brand-a1", name: "Brand Alpha" }],
      [ORG_B]: [{ id: "brand-b1", name: "Brand Beta" }],
    });

    const resultA = await loadOrgBrands(supabase, ORG_A);
    expect(resultA).toEqual({
      ok: true,
      brands: [{ id: "brand-a1", name: "Brand Alpha" }],
    });

    const resultB = await loadOrgBrands(supabase, ORG_B);
    expect(resultB).toEqual({
      ok: true,
      brands: [{ id: "brand-b1", name: "Brand Beta" }],
    });

    if (resultA.ok) {
      expect(resultA.brands.map((b) => b.id)).not.toContain("brand-b1");
    }
  });

  it("caps results at 6 brands even when more are available", async () => {
    const sevenBrands = Array.from({ length: 7 }, (_, i) => ({
      id: `brand-a${i + 1}`,
      name: `Brand ${i + 1}`,
    }));
    const supabase = fakeSupabase({ [ORG_A]: sevenBrands });

    const result = await loadOrgBrands(supabase, ORG_A);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.brands).toHaveLength(6);
      expect(result.brands.map((b) => b.id)).not.toContain("brand-a7");
    }
  });

  it("returns ok:false on a Supabase error instead of throwing or faking data", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () =>
                Promise.resolve({ data: null, error: new Error("boom") }),
            }),
          }),
        }),
      }),
    };

    await expect(loadOrgBrands(supabase, ORG_A)).resolves.toEqual({ ok: false });
  });

  it("returns ok:false instead of throwing when the client itself throws", async () => {
    const supabase = {
      from: () => {
        throw new Error("network down");
      },
    };

    await expect(loadOrgBrands(supabase, ORG_A)).resolves.toEqual({ ok: false });
  });

  it("falls back to a placeholder name for a null brand name rather than rendering blank", async () => {
    const supabase = fakeSupabase({ [ORG_A]: [{ id: "brand-a1", name: null as unknown as string }] });
    const result = await loadOrgBrands(supabase, ORG_A);
    expect(result).toEqual({ ok: true, brands: [{ id: "brand-a1", name: "Untitled brand" }] });
  });
});

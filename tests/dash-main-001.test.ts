import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  loadOrgBrands,
  loadOrgShoots,
  loadTrustedBrandIds,
} from "@/lib/dashboard/command-center";

const ORG_A = "aaaaaaaa-0000-4000-8000-000000000001";
const ORG_B = "bbbbbbbb-0000-4000-8000-000000000002";
const BRAND_A1 = "cccccccc-0000-4000-8000-000000000001";
const BRAND_B1 = "dddddddd-0000-4000-8000-000000000002";

type OrderCall = { column: string; opts: { ascending: boolean } };

/** Mimics supabase-js chained builder, scoped by the `eq("org_id", …)` call.
 *  `order` is chainable (production calls `.order().order().limit()` for a
 *  deterministic created_at + id sort) and every call is recorded so tests
 *  can assert the exact sort contract, not just that ordering happened.
 *  Cast to `SupabaseClient` at the boundary — loadOrgBrands is typed with
 *  the real client, not a shadow interface, so the fake only needs to
 *  satisfy the shape actually called at runtime. */
function fakeSupabase(
  rowsByOrg: Record<string, { id: string; name: string | null }[]>,
  orderCalls: OrderCall[] = [],
) {
  const orderBuilder = (value: string) => ({
    order: (column: string, opts: { ascending: boolean }) => {
      orderCalls.push({ column, opts });
      return orderBuilder(value);
    },
    limit(n: number) {
      return Promise.resolve({
        data: (rowsByOrg[value] ?? []).slice(0, n),
        error: null,
      });
    },
  });
  const fake = {
    from(table: string) {
      expect(table).toBe("brands");
      return {
        select() {
          return {
            eq(column: string, value: string) {
              expect(column).toBe("org_id");
              return orderBuilder(value);
            },
          };
        },
      };
    },
  };
  return fake as unknown as SupabaseClient;
}

/** Mimics the paginated, unordered `brands` read `loadTrustedBrandIds` makes
 *  (`select("id").eq("org_id", …).range(from, to)`, called repeatedly until
 *  a page comes back shorter than the page size). `rangeCalls`, when passed,
 *  records every `[from, to]` pair so tests can assert page boundaries. */
function fakeBrandIdsSupabase(
  rowsByOrg: Record<string, { id: string }[]>,
  rangeCalls?: [number, number][],
) {
  const fake = {
    from(table: string) {
      expect(table).toBe("brands");
      return {
        select() {
          return {
            eq(column: string, value: string) {
              expect(column).toBe("org_id");
              return {
                range(from: number, to: number) {
                  rangeCalls?.push([from, to]);
                  return Promise.resolve({
                    data: (rowsByOrg[value] ?? []).slice(from, to + 1),
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
  return fake as unknown as SupabaseClient;
}

/** Mimics the `shoot_portfolio_view` read `loadOrgShoots` makes, scoped by
 *  `.in("brand_id", brandIds)` rather than `.eq()`. */
type ShootRow = {
  id: string;
  name: string | null;
  status: string | null;
  cover_url?: string | null;
  dna_score?: number | null;
  target_channels?: string[] | null;
  updated_at?: string | null;
};

function fakeShootsSupabase(
  rowsByBrandId: Record<string, ShootRow[]>,
  orderCalls: OrderCall[] = [],
  selectCalls: string[] = [],
) {
  const orderBuilder = (brandIds: string[]) => ({
    order: (column: string, opts: { ascending: boolean }) => {
      orderCalls.push({ column, opts });
      return orderBuilder(brandIds);
    },
    limit(n: number) {
      const rows = brandIds.flatMap((id) => rowsByBrandId[id] ?? []);
      return Promise.resolve({ data: rows.slice(0, n), error: null });
    },
  });
  const fake = {
    from(table: string) {
      expect(table).toBe("shoot_portfolio_view");
      return {
        select(columns: string) {
          selectCalls.push(columns);
          return {
            in(column: string, brandIds: string[]) {
              expect(column).toBe("brand_id");
              return orderBuilder(brandIds);
            },
          };
        },
      };
    },
  };
  return fake as unknown as SupabaseClient;
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

  it("orders by created_at descending then id ascending, in that exact order", async () => {
    const orderCalls: OrderCall[] = [];
    const supabase = fakeSupabase({ [ORG_A]: [{ id: "brand-a1", name: "Brand Alpha" }] }, orderCalls);

    await loadOrgBrands(supabase, ORG_A);

    // Fails if a sort clause is removed, reversed, or the two are swapped —
    // both the column/direction and the call order are asserted.
    expect(orderCalls).toEqual([
      { column: "created_at", opts: { ascending: false } },
      { column: "id", opts: { ascending: true } },
    ]);
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
    const errorBuilder = {
      order: () => errorBuilder,
      limit: () => Promise.resolve({ data: null, error: new Error("boom") }),
    };
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => errorBuilder,
        }),
      }),
    } as unknown as SupabaseClient;

    await expect(loadOrgBrands(supabase, ORG_A)).resolves.toEqual({ ok: false });
  });

  it("returns ok:false instead of throwing when the client itself throws", async () => {
    const supabase = {
      from: () => {
        throw new Error("network down");
      },
    } as unknown as SupabaseClient;

    await expect(loadOrgBrands(supabase, ORG_A)).resolves.toEqual({ ok: false });
  });

  it("falls back to a placeholder name for a null brand name rather than rendering blank", async () => {
    const supabase = fakeSupabase({ [ORG_A]: [{ id: "brand-a1", name: null }] });
    const result = await loadOrgBrands(supabase, ORG_A);
    expect(result).toEqual({ ok: true, brands: [{ id: "brand-a1", name: "Untitled brand" }] });
  });
});

describe("loadTrustedBrandIds", () => {
  it("returns only the trusted org's brand ids, uncapped by the 6-brand display limit", async () => {
    const eightBrandIds = Array.from({ length: 8 }, (_, i) => ({ id: `brand-a${i + 1}` }));
    const supabase = fakeBrandIdsSupabase({ [ORG_A]: eightBrandIds, [ORG_B]: [{ id: "brand-b1" }] });

    const resultA = await loadTrustedBrandIds(supabase, ORG_A);
    expect(resultA.ok).toBe(true);
    if (resultA.ok) {
      expect(resultA.brandIds).toHaveLength(8);
      expect(resultA.brandIds).not.toContain("brand-b1");
    }
  });

  it("paginates past a single page (500) instead of silently truncating the scope", async () => {
    // 500 (page size) + 1 spans two pages — page 1 full, page 2 has exactly
    // the remainder. A single-`.limit()` read would drop this last id.
    const manyBrandIds = Array.from({ length: 501 }, (_, i) => ({ id: `brand-a${i + 1}` }));
    const rangeCalls: [number, number][] = [];
    const supabase = fakeBrandIdsSupabase({ [ORG_A]: manyBrandIds }, rangeCalls);

    const result = await loadTrustedBrandIds(supabase, ORG_A);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.brandIds).toHaveLength(501);
      expect(result.brandIds).toContain("brand-a501");
    }
    expect(rangeCalls).toEqual([
      [0, 499],
      [500, 999],
    ]);
  });

  it("refuses a partial scope instead of returning ok:true when the org exceeds the page-count ceiling", async () => {
    // Every page comes back completely full, forever — this must give up
    // and fail rather than loop indefinitely or hand back a truncated list.
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            range: (from: number, to: number) =>
              Promise.resolve({
                data: Array.from({ length: to - from + 1 }, (_, i) => ({ id: `brand-${from + i}` })),
                error: null,
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    await expect(loadTrustedBrandIds(supabase, ORG_A)).resolves.toEqual({ ok: false });
  });

  it("returns ok:false on a Supabase error", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({ range: () => Promise.resolve({ data: null, error: new Error("boom") }) }),
        }),
      }),
    } as unknown as SupabaseClient;

    await expect(loadTrustedBrandIds(supabase, ORG_A)).resolves.toEqual({ ok: false });
  });
});

describe("loadOrgShoots", () => {
  it("returns ok:true with an empty list, no query, when there are no trusted brand ids", async () => {
    let called = false;
    const supabase = {
      from: () => {
        called = true;
        throw new Error("should not be called for an empty brandIds list");
      },
    } as unknown as SupabaseClient;

    const result = await loadOrgShoots(supabase, []);
    expect(result).toEqual({ ok: true, shoots: [] });
    expect(called).toBe(false);
  });

  const EMPTY_MEDIA = { dnaScore: null, channel: null };

  it("scopes shoots to only the given trusted brand ids, never another brand's", async () => {
    const supabase = fakeShootsSupabase({
      [BRAND_A1]: [{ id: "shoot-a1", name: "Shoot Alpha", status: "in_progress" }],
      [BRAND_B1]: [{ id: "shoot-b1", name: "Shoot Beta", status: "in_progress" }],
    });

    const result = await loadOrgShoots(supabase, [BRAND_A1]);
    expect(result).toEqual({
      ok: true,
      shoots: [{ id: "shoot-a1", name: "Shoot Alpha", status: "in_progress", ...EMPTY_MEDIA }],
    });
    if (result.ok) {
      expect(result.shoots.map((s) => s.id)).not.toContain("shoot-b1");
    }
  });

  it("maps real dna_score/target_channels through, without fabricating either", async () => {
    const supabase = fakeShootsSupabase({
      [BRAND_A1]: [
        {
          id: "shoot-a1",
          name: "Shoot Alpha",
          status: "active",
          dna_score: 91,
          target_channels: ["IG", "TikTok"],
        },
      ],
    });

    const result = await loadOrgShoots(supabase, [BRAND_A1]);
    expect(result).toEqual({
      ok: true,
      shoots: [
        {
          id: "shoot-a1",
          name: "Shoot Alpha",
          status: "active",
          dnaScore: 91,
          // First target channel only — the meta line shows one channel, not a list.
          channel: "IG",
        },
      ],
    });
  });

  it("does not select or map cover_url/updated_at — no proven secure-delivery path for cover_url yet", async () => {
    // Two boundaries, both asserted: the query itself must not ask for
    // cover_url/updated_at (a leftover row column proves nothing about the
    // real select() string), and even if it somehow came back, the mapped
    // DashboardShoot must not surface it (see command-center.ts's doc
    // comment on loadOrgShoots — blocked on IPI-1112 · CLD-DELIVERY-001).
    const selectCalls: string[] = [];
    const supabase = fakeShootsSupabase(
      {
        [BRAND_A1]: [
          {
            id: "shoot-a1",
            name: "Shoot Alpha",
            status: "active",
            cover_url: "https://res.cloudinary.com/demo/image/upload/shoot-a1.jpg",
          },
        ],
      },
      undefined,
      selectCalls,
    );

    const result = await loadOrgShoots(supabase, [BRAND_A1]);

    expect(selectCalls).toHaveLength(1);
    expect(selectCalls[0]).not.toMatch(/\bcover_url\b/);
    expect(selectCalls[0]).not.toMatch(/\bupdated_at\b/);
    expect(result).toEqual({
      ok: true,
      shoots: [{ id: "shoot-a1", name: "Shoot Alpha", status: "active", ...EMPTY_MEDIA }],
    });
    if (result.ok) {
      expect(result.shoots[0]).not.toHaveProperty("coverUrl");
      expect(result.shoots[0]).not.toHaveProperty("updatedAt");
    }
  });

  it("maps a shoot with no real media/score to nulls, never a fabricated placeholder", async () => {
    const supabase = fakeShootsSupabase({
      [BRAND_A1]: [{ id: "shoot-a1", name: "Shoot Alpha", status: "planning" }],
    });

    const result = await loadOrgShoots(supabase, [BRAND_A1]);
    expect(result).toEqual({
      ok: true,
      shoots: [{ id: "shoot-a1", name: "Shoot Alpha", status: "planning", ...EMPTY_MEDIA }],
    });
  });

  it("reads shoot_portfolio_view, not raw shoot.shoots", async () => {
    const supabase = fakeShootsSupabase({ [BRAND_A1]: [] });
    // fakeShootsSupabase itself asserts the table name; a wrong table would
    // throw inside from() before this resolves.
    await expect(loadOrgShoots(supabase, [BRAND_A1])).resolves.toEqual({ ok: true, shoots: [] });
  });

  it("orders by updated_at descending then id ascending, in that exact order", async () => {
    const orderCalls: OrderCall[] = [];
    const supabase = fakeShootsSupabase(
      { [BRAND_A1]: [{ id: "shoot-a1", name: "Shoot Alpha", status: null }] },
      orderCalls,
    );

    await loadOrgShoots(supabase, [BRAND_A1]);

    expect(orderCalls).toEqual([
      { column: "updated_at", opts: { ascending: false } },
      { column: "id", opts: { ascending: true } },
    ]);
  });

  it("caps results at 6 shoots even when more are available", async () => {
    const sevenShoots = Array.from({ length: 7 }, (_, i) => ({
      id: `shoot-a${i + 1}`,
      name: `Shoot ${i + 1}`,
      status: "in_progress",
    }));
    const supabase = fakeShootsSupabase({ [BRAND_A1]: sevenShoots });

    const result = await loadOrgShoots(supabase, [BRAND_A1]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.shoots).toHaveLength(6);
      expect(result.shoots.map((s) => s.id)).not.toContain("shoot-a7");
    }
  });

  it("returns ok:false on a Supabase error instead of throwing or faking data", async () => {
    const errorBuilder = {
      order: () => errorBuilder,
      limit: () => Promise.resolve({ data: null, error: new Error("boom") }),
    };
    const supabase = {
      from: () => ({
        select: () => ({
          in: () => errorBuilder,
        }),
      }),
    } as unknown as SupabaseClient;

    await expect(loadOrgShoots(supabase, [BRAND_A1])).resolves.toEqual({ ok: false });
  });

  it("returns ok:false instead of throwing when the client itself throws", async () => {
    const supabase = {
      from: () => {
        throw new Error("network down");
      },
    } as unknown as SupabaseClient;

    await expect(loadOrgShoots(supabase, [BRAND_A1])).resolves.toEqual({ ok: false });
  });

  it("falls back to a placeholder name for a null shoot name rather than rendering blank", async () => {
    const supabase = fakeShootsSupabase({ [BRAND_A1]: [{ id: "shoot-a1", name: null, status: null }] });
    const result = await loadOrgShoots(supabase, [BRAND_A1]);
    expect(result).toEqual({
      ok: true,
      shoots: [{ id: "shoot-a1", name: "Untitled shoot", status: null, ...EMPTY_MEDIA }],
    });
  });

  it("still selects/orders by updated_at for sort, even though it's not in the mapped result", async () => {
    // Confirms the smaller select() didn't silently drop the sort contract —
    // see command-center.ts's comment: ORDER BY doesn't require the column
    // in SELECT (verified against the live PostgREST endpoint too).
    const orderCalls: OrderCall[] = [];
    const supabase = fakeShootsSupabase(
      { [BRAND_A1]: [{ id: "shoot-a1", name: "Shoot Alpha", status: null }] },
      orderCalls,
    );
    const result = await loadOrgShoots(supabase, [BRAND_A1]);
    expect(orderCalls[0]).toEqual({ column: "updated_at", opts: { ascending: false } });
    if (result.ok) {
      expect(result.shoots[0]).not.toHaveProperty("updatedAt");
    }
  });
});

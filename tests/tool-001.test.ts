import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { productionPlannerAgent } from "../src/mastra/agents";
import {
  EstimateShootBudgetInputSchema,
  GenerateShotListDraftInputSchema,
  PlanDeliverablesInputSchema,
  RecommendShootTypeInputSchema,
  estimateShootBudget,
  generateShotListDraft,
  planDeliverables,
  recommendShootType,
  type EstimateShootBudgetOutput,
  type GenerateShotListDraftOutput,
  type PlanDeliverablesOutput,
  type RecommendShootTypeOutput,
} from "../src/mastra/tools/planning";

// IPI-1049 · TOOL-001 — four compute-only planning tools. Schema validation
// (structurally invalid input) is tested via the exported Zod input schemas
// directly; business logic (valid input → typed output, needs_input,
// determinism) is tested via .execute(). The installed createTool().execute
// return type is `T | void | ValidationError` (Mastra can short-circuit on
// its own internal validation); these tools never return void/throw for
// valid parsed input, so results are cast to the tool's own output type.
// See src/mastra/tools/planning.ts for the exact Lumina source → adaptation
// mapping.

async function run<T>(promise: Promise<unknown>): Promise<T> {
  return (await promise) as T;
}

describe("recommendShootType", () => {
  it("returns a single confident recommendation for an unambiguous channel", async () => {
    const result = await run<RecommendShootTypeOutput>(
      recommendShootType.execute!({ channels: ["youtube"] } as never, {} as never),
    );
    expect(result.status).toBe("ok");
    expect(result.shootType).toBe("campaign");
    expect(result.candidates).toEqual(["campaign"]);
    expect(result.missingInputs).toEqual([]);
  });

  it("returns needs_input with all tied candidates when channels equally favor multiple types", async () => {
    const result = await run<RecommendShootTypeOutput>(
      recommendShootType.execute!({ channels: ["shopify", "amazon"] } as never, {} as never),
    );
    expect(result.status).toBe("needs_input");
    expect([...result.candidates].sort()).toEqual(["ecommerce_pdp", "packshot"]);
    expect(result.missingInputs.length).toBeGreaterThan(0);
    expect(result.shootType).toBeUndefined();
  });

  it("a brief keyword can break a channel tie", async () => {
    const result = await run<RecommendShootTypeOutput>(
      recommendShootType.execute!(
        { channels: ["shopify", "amazon"], brief: "packshot on white background" } as never,
        {} as never,
      ),
    );
    expect(result.status).toBe("ok");
    expect(result.shootType).toBe("packshot");
  });

  it("is deterministic for the same validated input", async () => {
    const input = { channels: ["instagram_feed"], brief: "editorial story" } as never;
    const a = await run<RecommendShootTypeOutput>(recommendShootType.execute!(input, {} as never));
    const b = await run<RecommendShootTypeOutput>(recommendShootType.execute!(input, {} as never));
    expect(a).toEqual(b);
  });

  it("rejects an empty channel list structurally", () => {
    expect(RecommendShootTypeInputSchema.safeParse({ channels: [] }).success).toBe(false);
  });

  it("rejects an unknown channel enum value structurally", () => {
    expect(RecommendShootTypeInputSchema.safeParse({ channels: ["carrier_pigeon"] }).success).toBe(false);
  });
});

describe("planDeliverables", () => {
  it("returns default quantities with explicit provenance", async () => {
    const result = await run<PlanDeliverablesOutput>(
      planDeliverables.execute!({ channels: ["instagram_feed"] } as never, {} as never),
    );
    expect(result.status).toBe("ok");
    expect(result.deliverables).toEqual([
      { channel: "instagram_feed", format: "1:1 JPG", quantity: 10, source: "ipix_default_v1", assumed: true },
    ]);
    expect(result.totalAssets).toBe(10);
  });

  it("boosts white-bg quantities for a packshot/ecommerce shoot type", async () => {
    const result = await run<PlanDeliverablesOutput>(
      planDeliverables.execute!({ channels: ["shopify"], shootType: "packshot" } as never, {} as never),
    );
    const whiteBg = result.deliverables.find((d) => d.format.includes("white-bg"));
    const lifestyle = result.deliverables.find((d) => !d.format.includes("white-bg"));
    expect(whiteBg?.quantity).toBe(8); // 6 + 2
    expect(lifestyle?.quantity).toBe(4); // unchanged
  });

  it("boosts video quantities when brand style keywords indicate video-heavy", async () => {
    const result = await run<PlanDeliverablesOutput>(
      planDeliverables.execute!(
        { channels: ["instagram_reel"], brandDna: { styleKeywords: ["motion-forward"] } } as never,
        {} as never,
      ),
    );
    expect(result.deliverables[0].quantity).toBe(6); // 5 + 1
  });

  it("is deterministic and arithmetically correct (totalAssets = sum of quantities)", async () => {
    const input = { channels: ["amazon", "youtube"] } as never;
    const a = await run<PlanDeliverablesOutput>(planDeliverables.execute!(input, {} as never));
    const b = await run<PlanDeliverablesOutput>(planDeliverables.execute!(input, {} as never));
    expect(a).toEqual(b);
    const sum = a.deliverables.reduce((s, d) => s + d.quantity, 0);
    expect(a.totalAssets).toBe(sum);
  });

  it("rejects an empty channel list structurally", () => {
    expect(PlanDeliverablesInputSchema.safeParse({ channels: [] }).success).toBe(false);
  });
});

describe("generateShotListDraft", () => {
  const oneReference = [
    { id: "ref-1", angle: "front", description: "front-facing product shot", channelFit: ["instagram_feed"] },
  ];

  it("builds shots only from trusted references, keeping referenceId provenance", async () => {
    const result = await run<GenerateShotListDraftOutput>(
      generateShotListDraft.execute!(
        {
          selectedDeliverables: [{ channel: "instagram_feed", format: "1:1", quantity: 3 }],
          trustedReferenceShotTypes: oneReference,
        } as never,
        {} as never,
      ),
    );
    expect(result.status).toBe("ok");
    expect(result.totalShots).toBe(1);
    expect(result.shots[0].referenceId).toBe("ref-1");
    expect(result.shots[0].angle).toBe("front"); // exact reference angle, never invented
    expect(result.warnings).toEqual([]);
  });

  it("warns about deliverables with no matching trusted reference instead of dropping them silently", async () => {
    const result = await run<GenerateShotListDraftOutput>(
      generateShotListDraft.execute!(
        {
          selectedDeliverables: [{ channel: "tiktok", quantity: 2 }],
          trustedReferenceShotTypes: oneReference, // only fits instagram_feed
        } as never,
        {} as never,
      ),
    );
    expect(result.shots).toEqual([]);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toMatch(/tiktok/);
  });

  it("is deterministic for the same validated input", async () => {
    const input = {
      selectedDeliverables: [{ channel: "instagram_feed", quantity: 6 }],
      trustedReferenceShotTypes: oneReference,
    } as never;
    const a = await run<GenerateShotListDraftOutput>(generateShotListDraft.execute!(input, {} as never));
    const b = await run<GenerateShotListDraftOutput>(generateShotListDraft.execute!(input, {} as never));
    expect(a).toEqual(b);
  });

  it("rejects empty selectedDeliverables structurally (fails safe, not silently)", () => {
    expect(
      GenerateShotListDraftInputSchema.safeParse({
        selectedDeliverables: [],
        trustedReferenceShotTypes: oneReference,
      }).success,
    ).toBe(false);
  });

  it("rejects empty trustedReferenceShotTypes structurally (fails safe, not silently)", () => {
    expect(
      GenerateShotListDraftInputSchema.safeParse({
        selectedDeliverables: [{ channel: "instagram_feed", quantity: 3 }],
        trustedReferenceShotTypes: [],
      }).success,
    ).toBe(false);
  });
});

describe("estimateShootBudget", () => {
  it("returns needs_input listing every undecided field, with no budget computed", async () => {
    const result = await run<EstimateShootBudgetOutput>(
      estimateShootBudget.execute!({ shootDays: 1, currency: "USD" } as never, {} as never),
    );
    expect(result.status).toBe("needs_input");
    expect([...result.missingInputs].sort()).toEqual(["crewCount", "shotCount", "studioType"]);
    expect(result.total).toBeUndefined();
    expect(result.assumptions).toEqual([]);
  });

  it("computes a transparent line-item estimate using ipix_default rates, each with provenance", async () => {
    const result = await run<EstimateShootBudgetOutput>(
      estimateShootBudget.execute!(
        { crewCount: 2, studioType: "location", shotCount: 10, shootDays: 1, currency: "USD" } as never,
        {} as never,
      ),
    );
    expect(result.status).toBe("ok");
    expect(result.crew).toBe(2 * 650 * 1);
    expect(result.studio).toBe(800 * 1);
    expect(result.equipment).toBe(2 * 180 * 1);
    expect(result.post).toBe(10 * 3 * 45); // no totalAssets given -> assets = shotCount * 3
    expect(result.total).toBe(result.crew! + result.studio! + result.equipment! + result.post!);
    expect(result.assumptions).toHaveLength(4);
    expect(result.assumptions.every((a) => a.source === "ipix_default_v1" && a.assumed === true)).toBe(true);
    expect(result.disclaimer).toMatch(/estimate/i);
    expect(result.disclaimer).not.toMatch(/confirmed production cost is/i);
  });

  it("uses explicit operator-supplied rates instead of defaults, with no assumption entries for them", async () => {
    const result = await run<EstimateShootBudgetOutput>(
      estimateShootBudget.execute!(
        {
          crewCount: 1,
          studioType: "owned",
          shotCount: 5,
          shootDays: 1,
          currency: "USD",
          rates: { crewDayRate: 500, studioDayRate: 0, equipmentDayRate: 100, postPerAsset: 20 },
        } as never,
        {} as never,
      ),
    );
    expect(result.assumptions).toEqual([]);
    expect(result.crew).toBe(500);
    expect(result.equipment).toBe(100);
    expect(result.post).toBe(5 * 3 * 20);
  });

  it("never produces NaN, Infinity, or a negative total for valid input", async () => {
    const result = await run<EstimateShootBudgetOutput>(
      estimateShootBudget.execute!(
        { crewCount: 1, studioType: "outdoor", shotCount: 1, shootDays: 1, currency: "USD" } as never,
        {} as never,
      ),
    );
    expect(Number.isFinite(result.total)).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it("is deterministic for the same validated input", async () => {
    const input = { crewCount: 3, studioType: "rental", shotCount: 8, shootDays: 2, currency: "USD" } as never;
    const a = await run<EstimateShootBudgetOutput>(estimateShootBudget.execute!(input, {} as never));
    const b = await run<EstimateShootBudgetOutput>(estimateShootBudget.execute!(input, {} as never));
    expect(a).toEqual(b);
  });

  it("rejects crewCount: 0 and negative shotCount structurally", () => {
    expect(
      EstimateShootBudgetInputSchema.safeParse({ crewCount: 0, studioType: "owned", shotCount: 5 }).success,
    ).toBe(false);
    expect(
      EstimateShootBudgetInputSchema.safeParse({ crewCount: 1, studioType: "owned", shotCount: -1 }).success,
    ).toBe(false);
  });
});

function importLines(src: string): string {
  return src
    .split("\n")
    .filter((line) => /^\s*import\b/.test(line))
    .join("\n");
}

describe("no forbidden imports in the four planning tools", () => {
  it("planning.ts imports no Supabase/Postgres/service-role/Cloudinary/payment client", () => {
    const imports = importLines(
      readFileSync(new URL("../src/mastra/tools/planning.ts", import.meta.url), "utf8"),
    );
    expect(imports).not.toMatch(/supabase|postgres|service[-_]?role|cloudinary|stripe|^\s*from ["']pg["']/i);
  });
  it("planning.ts calls no network fetch", () => {
    const src = readFileSync(new URL("../src/mastra/tools/planning.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/\bfetch\(/);
  });

  it("shot-list-from-references.ts (the shared pure helper) imports no forbidden client and calls no fetch", () => {
    const src = readFileSync(new URL("../src/lib/shoot/shot-list-from-references.ts", import.meta.url), "utf8");
    expect(importLines(src)).not.toMatch(/supabase|postgres|service[-_]?role|cloudinary|stripe/i);
    expect(src).not.toMatch(/\bfetch\(/);
  });
});

describe("Planner integration", () => {
  it("the canonical Production Planner exposes exactly the four planning tools", async () => {
    const tools = await productionPlannerAgent.listTools();
    expect(Object.keys(tools).sort()).toEqual(
      ["estimateShootBudget", "generateShotListDraft", "planDeliverables", "recommendShootType"].sort(),
    );
  });
});

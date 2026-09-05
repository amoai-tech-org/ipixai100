import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  buildShotListFromReferences,
  type SelectedDeliverable,
  type TrustedReferenceShotType,
} from "@/lib/shoot/shot-list-from-references";
import { emptyResult, planningResultFields, type Assumption } from "./planning-types";

/**
 * IPI-1049 · TOOL-001 — four compute-only Planner tools, adapted from Lumina
 * (amoai-tech/luminaai@main, app/src/mastra/tools/{recommendShootType,
 * planDeliverables, generateShotListDraft, estimateShootBudget}.ts).
 *
 * Deliberately NOT wired to Supabase: a task-verifier audit (2026-09-05) found
 * live reference tables (`platforms`, `image_specs`, `image_type_defs`,
 * `recommendation_rules`) that overlap conceptually with the channel/rule
 * data below, all safely authenticated-readable. Left as documented
 * `ipix_default_v1` constants per this task's explicit "no Supabase/network
 * imports for these four tools" contract — wiring them in is a follow-up
 * decision for whoever owns that reconciliation (see PR description), not a
 * silent scope change here. `platforms.slug` in the live schema is coarser
 * (e.g. "instagram") than the channel granularity below (instagram_feed vs
 * _story vs _reel) — reconciling that split is part of the same follow-up.
 */

const CHANNELS = [
  "instagram_feed",
  "instagram_story",
  "instagram_reel",
  "tiktok",
  "pinterest",
  "amazon",
  "shopify",
  "facebook",
  "youtube",
  "website",
] as const;
const ChannelSchema = z.enum(CHANNELS);

const DEFAULT_SOURCE = "ipix_default_v1";

// ---------------------------------------------------------------------------
// 1. recommendShootType
// ---------------------------------------------------------------------------

// ipix_default_v1 taxonomy — not yet confirmed against a live canonical
// source (see file header). shoots.shoot_type in the live schema is a
// different, unrelated enum (photography/video/hybrid); do not conflate them.
const SHOOT_TYPE_CHANNEL_AFFINITY: Record<string, string[]> = {
  ecommerce_pdp: ["shopify", "amazon", "website"],
  editorial: ["instagram_feed", "pinterest", "facebook"],
  ugc_style: ["instagram_reel", "tiktok"],
  lookbook: ["instagram_feed", "pinterest", "instagram_story"],
  campaign: ["instagram_feed", "instagram_reel", "facebook", "youtube"],
  packshot: ["shopify", "amazon"],
};

const SHOOT_TYPE_BRIEF_BOOSTERS: Record<string, string[]> = {
  ecommerce_pdp: ["pdp", "product detail", "listing", "ecommerce", "e-commerce"],
  editorial: ["editorial", "story", "magazine", "fashion", "lifestyle"],
  ugc_style: ["ugc", "user generated", "authentic", "organic", "creator"],
  lookbook: ["lookbook", "collection", "seasonal", "catalog"],
  campaign: ["campaign", "brand awareness", "hero", "launch"],
  packshot: ["packshot", "pack shot", "packaging", "white background", "white bg"],
};

export const RecommendShootTypeInputSchema = z.object({
  channels: z.array(ChannelSchema).min(1),
  brief: z.string().optional(),
  productCategory: z.string().optional(),
  brandDnaSummary: z.string().optional(),
});
export const RecommendShootTypeOutputSchema = z.object({
  ...planningResultFields,
  shootType: z.string().optional(),
  candidates: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  rationale: z.string().optional(),
});
export type RecommendShootTypeOutput = z.infer<typeof RecommendShootTypeOutputSchema>;

export const recommendShootType = createTool({
  id: "recommendShootType",
  description:
    "Recommend a shoot type (ecommerce_pdp, editorial, ugc_style, lookbook, campaign, packshot) from " +
    "channels, brief, and brand context. Returns needs_input with candidates when signal is tied or absent " +
    "— never silently defaults to ecommerce.",
  inputSchema: RecommendShootTypeInputSchema,
  outputSchema: RecommendShootTypeOutputSchema,
  execute: async (input) => {
    const { channels, brief = "", productCategory = "", brandDnaSummary = "" } = input;
    const contextText = `${brief} ${productCategory} ${brandDnaSummary}`.toLowerCase();

    const scores: Record<string, number> = {};
    for (const [type, matchChannels] of Object.entries(SHOOT_TYPE_CHANNEL_AFFINITY)) {
      scores[type] = channels.filter((c) => matchChannels.includes(c)).length;
      const boosters = SHOOT_TYPE_BRIEF_BOOSTERS[type] ?? [];
      if (boosters.some((kw) => contextText.includes(kw))) scores[type] += 1;
    }

    const maxScore = Math.max(...Object.values(scores));
    const topTypes = Object.entries(scores)
      .filter(([, score]) => score === maxScore)
      .map(([type]) => type);

    if (maxScore === 0) {
      return {
        ...emptyResult("needs_input", [
          "No channel or brief/brand signal matched any shoot type — provide channels or a brief describing the shoot's purpose (e.g. ecommerce, editorial, campaign).",
        ]),
        candidates: Object.keys(SHOOT_TYPE_CHANNEL_AFFINITY),
      };
    }
    if (topTypes.length > 1) {
      return {
        ...emptyResult("needs_input", [
          `Tied signal between ${topTypes.join(", ")} — provide a brief or narrow the channel list to disambiguate.`,
        ]),
        candidates: topTypes,
      };
    }

    const shootType = topTypes[0];
    const confidence: "high" | "medium" | "low" = maxScore >= 2 ? "high" : "medium";
    return {
      ...emptyResult("ok"),
      shootType,
      candidates: [shootType],
      confidence,
      rationale: `Best match for channels [${channels.join(", ")}]${brief ? " and brief context" : ""} based on channel-type affinity and brand context.`,
    };
  },
});

// ---------------------------------------------------------------------------
// 2. planDeliverables
// ---------------------------------------------------------------------------

// ipix_default_v1 — see file header; not yet reconciled with the live
// platforms/image_specs/image_type_defs reference tables.
const CHANNEL_DELIVERABLE_DEFAULTS: Record<string, { format: string; quantity: number }[]> = {
  instagram_feed: [{ format: "1:1 JPG", quantity: 10 }],
  instagram_story: [{ format: "9:16 JPG", quantity: 8 }],
  instagram_reel: [{ format: "9:16 MP4 :15s", quantity: 5 }],
  tiktok: [{ format: "9:16 MP4 :30s", quantity: 5 }],
  pinterest: [{ format: "2:3 JPG", quantity: 6 }],
  amazon: [
    { format: "1:1 JPG white-bg", quantity: 8 },
    { format: "lifestyle JPG", quantity: 4 },
  ],
  shopify: [
    { format: "1:1 JPG white-bg", quantity: 6 },
    { format: "lifestyle JPG", quantity: 4 },
  ],
  facebook: [{ format: "4:5 JPG", quantity: 5 }],
  youtube: [{ format: "16:9 MP4 :60s", quantity: 2 }],
  website: [
    { format: "16:9 JPG hero", quantity: 3 },
    { format: "1:1 JPG card", quantity: 6 },
  ],
};

const DeliverableSchema = z.object({
  channel: z.string(),
  format: z.string(),
  quantity: z.number().int().positive(),
  source: z.string(),
  assumed: z.literal(true),
});

export const PlanDeliverablesInputSchema = z.object({
  channels: z.array(ChannelSchema).min(1),
  shootType: z.string().optional(),
  brandDna: z
    .object({
      productCategory: z.string().optional(),
      styleKeywords: z.array(z.string()).optional(),
    })
    .optional(),
});
export const PlanDeliverablesOutputSchema = z.object({
  ...planningResultFields,
  deliverables: z.array(DeliverableSchema),
  totalAssets: z.number(),
});
export type PlanDeliverablesOutput = z.infer<typeof PlanDeliverablesOutputSchema>;

export const planDeliverables = createTool({
  id: "planDeliverables",
  description:
    "Derive a reviewable deliverable set (format + quantity per channel) from target channels and " +
    "optional shoot type / brand context. Every quantity is an explicit ipix_default assumption, not " +
    "confirmed business truth.",
  inputSchema: PlanDeliverablesInputSchema,
  outputSchema: PlanDeliverablesOutputSchema,
  execute: async (input) => {
    const { channels, brandDna, shootType } = input;
    const isPackshot = shootType === "packshot" || shootType === "ecommerce_pdp";
    const isVideoHeavy = brandDna?.styleKeywords?.some((k) => /video|motion|reel/i.test(k)) ?? false;

    const deliverables = channels.flatMap((channel) => {
      const defaults = CHANNEL_DELIVERABLE_DEFAULTS[channel];
      return defaults.map((d) => ({
        channel,
        format: d.format,
        quantity:
          isPackshot && d.format.includes("white-bg")
            ? d.quantity + 2
            : isVideoHeavy && d.format.includes("MP4")
              ? d.quantity + 1
              : d.quantity,
        source: DEFAULT_SOURCE,
        assumed: true as const,
      }));
    });

    return {
      ...emptyResult("ok"),
      deliverables,
      totalAssets: deliverables.reduce((sum, d) => sum + d.quantity, 0),
    };
  },
});

// ---------------------------------------------------------------------------
// 3. generateShotListDraft
// ---------------------------------------------------------------------------

const SelectedDeliverableSchema = z.object({
  id: z.string().optional(),
  channel: z.string(),
  format: z.string().optional(),
  quantity: z.number().int().positive(),
});

const TrustedReferenceShotTypeSchema = z.object({
  id: z.string(),
  angle: z.string(),
  description: z.string(),
  channelFit: z.array(z.string()),
  background: z.string().nullable().optional(),
});

const ShotSchema = z.object({
  shotNumber: z.number(),
  description: z.string(),
  angle: z.string(),
  lighting: z.string(),
  deliverableIds: z.array(z.string()),
  notes: z.string().optional(),
  referenceId: z.string(),
});

export const GenerateShotListDraftInputSchema = z.object({
  selectedDeliverables: z
    .array(SelectedDeliverableSchema)
    .min(1, "At least one selected deliverable is required before generating a shot list"),
  trustedReferenceShotTypes: z
    .array(TrustedReferenceShotTypeSchema)
    .min(1, "trustedReferenceShotTypes is required — the real trusted-reference provider is a separate upstream task; pass known reference rows explicitly until then"),
  shootType: z.string().optional(),
  brandDnaSummary: z.string().optional(),
  productNames: z.array(z.string()).optional(),
});
export const GenerateShotListDraftOutputSchema = z.object({
  ...planningResultFields,
  shots: z.array(ShotSchema),
  totalShots: z.number(),
});
export type GenerateShotListDraftOutput = z.infer<typeof GenerateShotListDraftOutputSchema>;

export const generateShotListDraft = createTool({
  id: "generateShotListDraft",
  description:
    "Generate a shot list draft from selected deliverables and trusted reference shot types. Requires " +
    "selectedDeliverables (reviewed, not yet formally approved) and trustedReferenceShotTypes as explicit " +
    "input — the real trusted-reference provider is owned by IPI-1081 · PLAN-001, not this tool. Never " +
    "invents a shot angle; every shot keeps its source referenceId.",
  inputSchema: GenerateShotListDraftInputSchema,
  outputSchema: GenerateShotListDraftOutputSchema,
  execute: async (input) => {
    const { selectedDeliverables, trustedReferenceShotTypes, productNames = [] } = input;

    const { shots, uncoveredDeliverableWarnings } = buildShotListFromReferences(
      selectedDeliverables as SelectedDeliverable[],
      trustedReferenceShotTypes as TrustedReferenceShotType[],
      productNames,
    );

    return {
      ...emptyResult("ok"),
      warnings: uncoveredDeliverableWarnings,
      shots,
      totalShots: shots.length,
    };
  },
});

// ---------------------------------------------------------------------------
// 4. estimateShootBudget
// ---------------------------------------------------------------------------

// ipix_default_v1 — reference values only, not durable business truth (Correction 3).
const DEFAULT_STUDIO_DAY_RATE: Record<string, number> = {
  rental: 1200,
  owned: 0,
  location: 800,
  outdoor: 200,
};
const DEFAULT_CREW_DAY_RATE = 650;
const DEFAULT_EQUIPMENT_DAY_RATE_PER_CREW = 180;
const DEFAULT_POST_PER_ASSET = 45;

const RatesSchema = z.object({
  crewDayRate: z.number().nonnegative().optional(),
  studioDayRate: z.number().nonnegative().optional(),
  equipmentDayRate: z.number().nonnegative().optional(),
  postPerAsset: z.number().nonnegative().optional(),
});

export const EstimateShootBudgetInputSchema = z.object({
  crewCount: z.number().int().min(1).optional(),
  studioType: z.enum(["rental", "owned", "location", "outdoor"]).optional(),
  shotCount: z.number().int().min(1).optional(),
  shootDays: z.number().int().min(1).default(1),
  totalAssets: z.number().int().min(1).optional(),
  currency: z.string().default("USD"),
  rates: RatesSchema.optional(),
});
export const EstimateShootBudgetOutputSchema = z.object({
  ...planningResultFields,
  crew: z.number().optional(),
  studio: z.number().optional(),
  equipment: z.number().optional(),
  post: z.number().optional(),
  total: z.number().optional(),
  currency: z.string().optional(),
  disclaimer: z.string().optional(),
});
export type EstimateShootBudgetOutput = z.infer<typeof EstimateShootBudgetOutputSchema>;

export const estimateShootBudget = createTool({
  id: "estimateShootBudget",
  description:
    "Calculate a transparent line-item budget estimate (crew/studio/equipment/post/total) from validated " +
    "inputs. Returns needs_input when crewCount, studioType, or shotCount aren't decided yet. Any rate not " +
    "explicitly supplied is an ipix_default assumption, returned with provenance. Never presents the total " +
    "as confirmed production cost.",
  inputSchema: EstimateShootBudgetInputSchema,
  outputSchema: EstimateShootBudgetOutputSchema,
  execute: async (input) => {
    const { crewCount, studioType, shotCount, shootDays, totalAssets, currency, rates } = input;

    const missingInputs: string[] = [];
    if (crewCount === undefined) missingInputs.push("crewCount");
    if (studioType === undefined) missingInputs.push("studioType");
    if (shotCount === undefined) missingInputs.push("shotCount");
    if (missingInputs.length > 0) {
      return emptyResult("needs_input", missingInputs);
    }

    const assumptions: Assumption[] = [];
    const crewDayRate = rates?.crewDayRate;
    if (crewDayRate === undefined) {
      assumptions.push({ key: "crewDayRate", value: DEFAULT_CREW_DAY_RATE, currency, source: DEFAULT_SOURCE, assumed: true });
    }
    const studioDayRate = rates?.studioDayRate;
    if (studioDayRate === undefined) {
      assumptions.push({
        key: "studioDayRate",
        value: DEFAULT_STUDIO_DAY_RATE[studioType as string] ?? DEFAULT_STUDIO_DAY_RATE.location,
        currency,
        source: DEFAULT_SOURCE,
        assumed: true,
      });
    }
    const equipmentDayRate = rates?.equipmentDayRate;
    if (equipmentDayRate === undefined) {
      assumptions.push({ key: "equipmentDayRate", value: DEFAULT_EQUIPMENT_DAY_RATE_PER_CREW, currency, source: DEFAULT_SOURCE, assumed: true });
    }
    const postPerAsset = rates?.postPerAsset;
    if (postPerAsset === undefined) {
      assumptions.push({ key: "postPerAsset", value: DEFAULT_POST_PER_ASSET, currency, source: DEFAULT_SOURCE, assumed: true });
    }

    const effectiveCrewDayRate = crewDayRate ?? DEFAULT_CREW_DAY_RATE;
    const effectiveStudioDayRate = studioDayRate ?? DEFAULT_STUDIO_DAY_RATE[studioType as string] ?? DEFAULT_STUDIO_DAY_RATE.location;
    const effectiveEquipmentDayRate = equipmentDayRate ?? DEFAULT_EQUIPMENT_DAY_RATE_PER_CREW;
    const effectivePostPerAsset = postPerAsset ?? DEFAULT_POST_PER_ASSET;

    const crew = (crewCount as number) * effectiveCrewDayRate * shootDays;
    const studio = effectiveStudioDayRate * shootDays;
    const equipment = Math.round((crewCount as number) * effectiveEquipmentDayRate * shootDays);
    const assets = totalAssets ?? (shotCount as number) * 3;
    const post = assets * effectivePostPerAsset;
    const total = crew + studio + equipment + post;

    return {
      ...emptyResult("ok"),
      assumptions,
      crew,
      studio,
      equipment,
      post,
      total,
      currency,
      disclaimer: `Estimate only, based on ${assumptions.length > 0 ? "supplied and ipix_default" : "supplied"} rate assumptions — not a confirmed production cost. Rates vary by market.`,
    };
  },
});

export const planningTools = {
  recommendShootType,
  planDeliverables,
  generateShotListDraft,
  estimateShootBudget,
};

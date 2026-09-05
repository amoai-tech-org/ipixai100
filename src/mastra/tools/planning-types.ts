import { z } from "zod";

/**
 * IPI-1049 · TOOL-001 shared result convention (task Correction 4). Every
 * planning tool returns this shape so the Planner has one consistent pattern
 * for "ask the operator" vs "here's a computed draft":
 *
 * - Zod rejects structurally invalid input (negative counts, bad enums) —
 *   that's a tool-call error, not a `needs_input` result.
 * - `needs_input` is for structurally valid but business-insufficient
 *   input (a field genuinely not decided yet, or — for recommendShootType —
 *   a tie/zero-signal result with no single defensible answer).
 * - `assumptions` lists only values this tool defaulted on the operator's
 *   behalf (never operator-supplied values) so nothing computed looks more
 *   certain than it is.
 */
export const PlanningStatusSchema = z.enum(["ok", "needs_input"]);
export type PlanningStatus = z.infer<typeof PlanningStatusSchema>;

// ipix_default_v1 — a starter list, not an authoritative ISO 4217 source.
// Shared between estimateShootBudget's input/output and Assumption entries
// so a currency string can't drift between "what was requested" and "what a
// defaulted rate says it's denominated in".
export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
export const CurrencySchema = z.enum(CURRENCIES);
export type Currency = z.infer<typeof CurrencySchema>;

export const AssumptionSchema = z.object({
  key: z.string(),
  value: z.union([z.number(), z.string()]),
  currency: CurrencySchema.optional(),
  source: z.string(),
  assumed: z.literal(true),
});
export type Assumption = z.infer<typeof AssumptionSchema>;

export const planningResultFields = {
  status: PlanningStatusSchema,
  missingInputs: z.array(z.string()),
  assumptions: z.array(AssumptionSchema),
  warnings: z.array(z.string()),
};

/** No result field ever implies a save/approval/booking/payment occurred — these four tools are compute-only. */
export function emptyResult(status: PlanningStatus, missingInputs: string[] = []) {
  return { status, missingInputs, assumptions: [] as Assumption[], warnings: [] as string[] };
}

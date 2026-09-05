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

export const AssumptionSchema = z.object({
  key: z.string(),
  value: z.union([z.number(), z.string()]),
  currency: z.string().optional(),
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

/**
 * IPI-1049 · TOOL-001 — pure shot-list construction. Adapted from Lumina
 * (amoai-tech/luminaai@main, app/src/lib/shoot/shot-list-from-references.ts).
 *
 * Renamed per this task's Correction 1/2 (do not imply formal approval, keep
 * the trusted-reference input name explicit): `approvedDeliverables` →
 * `selectedDeliverables`, `reference_shot_types` → `trustedReferenceShotTypes`.
 * Behavior otherwise unchanged: never invent a shot angle, every shot keeps
 * its source reference id, uncovered deliverables come back as warnings
 * rather than silently dropped.
 */

export type TrustedReferenceShotType = {
  id: string;
  angle: string;
  description: string;
  channelFit: string[];
  background?: string | null;
};

export type SelectedDeliverable = {
  id?: string;
  channel: string;
  format?: string;
  quantity: number;
};

export type BuiltShot = {
  shotNumber: number;
  description: string;
  angle: string;
  lighting: string;
  deliverableIds: string[];
  notes?: string;
  referenceId: string;
};

/** Wizard channel ids → shot_type_references.channel_fit values (Lumina naming preserved — same reference-library contract). */
export function toReferenceChannel(channel: string): string {
  return channel === "shopify" ? "shopify_pdp" : channel;
}

export function channelMatchesReference(deliverableChannel: string, channelFit: string[]): boolean {
  const refChannel = toReferenceChannel(deliverableChannel);
  return channelFit.includes(deliverableChannel) || channelFit.includes(refChannel);
}

function lightingFromBackground(background: string | null | undefined): string {
  if (!background) return "studio strobe";
  if (background === "white") return "even studio light";
  if (background === "lifestyle") return "natural window light";
  if (background === "custom_backdrop") return "styled key light";
  if (background === "studio_gradient") return "studio strobe with gradient";
  return "studio strobe";
}

export function pickReferencesForDeliverable(
  deliverableChannel: string,
  references: TrustedReferenceShotType[],
  count: number,
): TrustedReferenceShotType[] {
  const matching = references.filter((r) => channelMatchesReference(deliverableChannel, r.channelFit));
  if (!matching.length) return [];
  const picked: TrustedReferenceShotType[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(matching[i % matching.length]);
  }
  return picked;
}

/**
 * Throws only on a genuinely invented reference id (a real bug, not a
 * business-input gap) — empty trustedReferenceShotTypes is validated by the
 * tool's Zod schema (`.min(1)`) before this helper ever runs.
 */
export function buildShotListFromReferences(
  selectedDeliverables: SelectedDeliverable[],
  trustedReferenceShotTypes: TrustedReferenceShotType[],
  productNames: string[] = [],
): { shots: BuiltShot[]; uncoveredDeliverableWarnings: string[] } {
  const allowedReferenceIds = new Set(trustedReferenceShotTypes.map((r) => r.id));
  let shotCounter = 0;
  const shots: BuiltShot[] = [];

  for (let di = 0; di < selectedDeliverables.length; di++) {
    const deliverable = selectedDeliverables[di];
    const deliverableId = deliverable.id ?? `deliverable-${di}`;
    const shotCount = Math.max(1, Math.ceil(deliverable.quantity / 3));
    const refs = pickReferencesForDeliverable(deliverable.channel, trustedReferenceShotTypes, shotCount);

    for (const ref of refs) {
      if (!allowedReferenceIds.has(ref.id)) {
        throw new Error(`Invented reference id "${ref.id}" — references must come from trustedReferenceShotTypes`);
      }
      shots.push({
        shotNumber: ++shotCounter,
        description: `${deliverable.channel} ${deliverable.format ?? ""} — ${ref.description}`.trim(),
        angle: ref.angle,
        lighting: lightingFromBackground(ref.background),
        deliverableIds: [deliverableId],
        referenceId: ref.id,
        notes: productNames[0] ? `Product: ${productNames[0]}` : undefined,
      });
    }
  }

  const coveredIds = new Set(shots.flatMap((s) => s.deliverableIds));
  const uncoveredDeliverableWarnings = selectedDeliverables
    .filter((d, i) => !coveredIds.has(d.id ?? `deliverable-${i}`))
    .map((d) => `Deliverable ${d.channel}/${d.format ?? ""} has no shots — no trusted reference matches this channel`);

  return { shots, uncoveredDeliverableWarnings };
}

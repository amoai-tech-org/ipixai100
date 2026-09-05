import type { OnboardingDraft } from "./schema";

export const EMPTY_DRAFT: OnboardingDraft = { brandName: "", websiteUrl: "" };

/** Persist / restore the Phase-1 draft inside onboarding_sessions.draft_answers. */
export function serializeDraftAnswers(draft: OnboardingDraft): Record<string, unknown> {
  return { brandName: draft.brandName, websiteUrl: draft.websiteUrl };
}

export function parseDraftAnswers(raw: unknown): OnboardingDraft {
  if (typeof raw !== "object" || raw === null) return { ...EMPTY_DRAFT };
  const o = raw as Record<string, unknown>;
  return {
    brandName: typeof o.brandName === "string" ? o.brandName : "",
    websiteUrl: typeof o.websiteUrl === "string" ? o.websiteUrl : "",
  };
}
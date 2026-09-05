import { z } from "zod";

/** Session row status — must stay split from brands.intake_status. */
export const onboardingSessionStatusSchema = z.enum(["draft", "materialized"]);

export type OnboardingSessionStatus = z.infer<typeof onboardingSessionStatusSchema>;

export const onboardingSessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  idempotency_key: z.string().min(1),
  status: onboardingSessionStatusSchema,
  current_screen: z.number().int().min(1).max(13),
  draft_answers: z.record(z.string(), z.unknown()),
  organization_id: z.string().uuid().nullable(),
  brand_id: z.string().uuid().nullable(),
});

export type OnboardingSession = z.infer<typeof onboardingSessionSchema>;

/** materialize_onboarding_session returns { organization_id, brand_id }. */
export const materializeResultSchema = z.object({
  organization_id: z.string().uuid(),
  brand_id: z.string().uuid(),
});

export type MaterializeResult = z.infer<typeof materializeResultSchema>;

/** Minimal Phase-1 draft: brand name (required) + website (optional). */
export const onboardingDraftSchema = z.object({
  brandName: z.string(),
  websiteUrl: z.string(),
});

export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;

/**
 * Branded identifiers so onboarding boundaries never mix a user id, session id,
 * and idempotency key. The cast helpers are the only way to mint them — callers
 * cast at the verified boundary (server operator id, Supabase row id).
 */
export type OnboardingUserId = string & { readonly __brand: "OnboardingUserId" };
export type OnboardingSessionId = string & { readonly __brand: "OnboardingSessionId" };
export type OnboardingIdempotencyKey = string & { readonly __brand: "OnboardingIdempotencyKey" };

export const asOnboardingUserId = (id: string): OnboardingUserId => id as OnboardingUserId;
export const asOnboardingSessionId = (id: string): OnboardingSessionId => id as OnboardingSessionId;
export const asOnboardingIdempotencyKey = (key: string): OnboardingIdempotencyKey =>
  key as OnboardingIdempotencyKey;
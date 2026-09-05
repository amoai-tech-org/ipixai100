/**
 * IPI-1089 · ONBOARD-001 — stable per-user onboarding idempotency key.
 *
 * Adapted from amoai-tech/luminaai (app/src/lib/onboarding/idempotency-key.ts).
 * One UUID per signed-in user, stored in localStorage under a user-scoped slot,
 * so refresh resumes the same onboarding_sessions draft and two users sharing a
 * browser never reuse one key.
 */
import type { OnboardingIdempotencyKey, OnboardingUserId } from "./schema";

const ONBOARDING_IDEMPOTENCY_STORAGE_PREFIX = "ipix:onboarding:idempotency:v1:";

export function onboardingIdempotencyStorageKey(userId: OnboardingUserId): string {
  return `${ONBOARDING_IDEMPOTENCY_STORAGE_PREFIX}${userId}`;
}

type IdempotencyStorage = Pick<Storage, "getItem" | "setItem">;

export function getOrCreateOnboardingIdempotencyKey(
  userId: OnboardingUserId,
  storage: IdempotencyStorage = localStorage,
): OnboardingIdempotencyKey {
  if (!userId.trim()) {
    throw new Error("onboarding idempotency key requires a user id");
  }

  const storageKey = onboardingIdempotencyStorageKey(userId);
  const existing = storage.getItem(storageKey);
  if (existing && existing.length > 0) return existing as OnboardingIdempotencyKey;

  const created = crypto.randomUUID();
  storage.setItem(storageKey, created);
  return created as OnboardingIdempotencyKey;
}
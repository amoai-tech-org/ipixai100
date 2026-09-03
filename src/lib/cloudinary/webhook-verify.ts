import "server-only";

import { cloudinary } from "@/lib/cloudinary/config";

const DEFAULT_VALID_FOR_SECONDS = 7200;

/**
 * Verify Cloudinary notification HMAC using the official SDK helper
 * (`utils.webhook_signature`) with an explicit secret — no process-wide
 * `cloudinary.config({ api_secret })` swap.
 *
 * Observe `X-Cld-Signature_v2` when present (auth_scheme=default) but do not
 * require EdDSA verification — live upload/delete triggers use legacy_hmac.
 */
export function verifyCloudinaryNotification(args: {
  rawBody: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
  signatureV2Header?: string | null;
  validForSeconds?: number;
}): { ok: true } | { ok: false; reason: string } {
  const timestampRaw = args.timestampHeader?.trim() ?? "";
  const signature = args.signatureHeader?.trim() ?? "";
  if (!timestampRaw || !signature) {
    return { ok: false, reason: "missing_signature_headers" };
  }

  const timestamp = Number(timestampRaw);
  if (!Number.isFinite(timestamp)) {
    return { ok: false, reason: "invalid_timestamp" };
  }

  const validFor = args.validForSeconds ?? DEFAULT_VALID_FOR_SECONDS;
  if (timestamp < Math.round(Date.now() / 1000) - validFor) {
    return { ok: false, reason: "timestamp_expired" };
  }

  const notificationSecret = process.env.CLOUDINARY_NOTIFICATION_API_SECRET;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const secret = notificationSecret || apiSecret;
  if (!secret) {
    return { ok: false, reason: "missing_api_secret" };
  }

  // Official SDK path with per-call secret (same hash as verifyNotificationSignature).
  const expected = cloudinary.utils.webhook_signature(args.rawBody, timestamp, {
    api_secret: secret,
  });
  if (expected !== signature) {
    return { ok: false, reason: "signature_mismatch" };
  }

  // Observe v2 header for ops/debug; do not fail closed on its presence/absence.
  void args.signatureV2Header;

  return { ok: true };
}

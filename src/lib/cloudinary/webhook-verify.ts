import "server-only";

import { cloudinary } from "@/lib/cloudinary/config";

const DEFAULT_VALID_FOR_SECONDS = 7200;

/**
 * Verify Cloudinary notification HMAC using the official SDK helper.
 * Prefer CLOUDINARY_NOTIFICATION_API_SECRET when a dedicated webhook key is set.
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

  const notificationSecret = process.env.CLOUDINARY_NOTIFICATION_API_SECRET;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const secret = notificationSecret || apiSecret;
  if (!secret) {
    return { ok: false, reason: "missing_api_secret" };
  }

  const previousSecret = cloudinary.config().api_secret;
  cloudinary.config({ api_secret: secret });
  try {
    const valid = cloudinary.utils.verifyNotificationSignature(
      args.rawBody,
      timestamp,
      signature,
      args.validForSeconds ?? DEFAULT_VALID_FOR_SECONDS,
    );
    if (!valid) {
      return { ok: false, reason: "signature_mismatch" };
    }
  } finally {
    cloudinary.config({ api_secret: previousSecret });
  }

  // Observe v2 header for ops/debug; do not fail closed on its presence/absence.
  void args.signatureV2Header;

  return { ok: true };
}

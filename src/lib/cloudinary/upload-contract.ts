/**
 * Shared signed-upload context for IPI-1110 (signer) ↔ IPI-1111 (webhook).
 * Field names are frozen — change only with a schema_version bump.
 */
export const UPLOAD_CONTEXT_SCHEMA_VERSION = "1" as const;

/** Unsigned Power Start preset — never for operator DAM uploads. */
export const FORBIDDEN_UPLOAD_PRESETS = new Set(["ai_powerstart"]);

/**
 * Params the server may include in the string-to-sign.
 * Client-supplied values for these keys are ignored; server derives them.
 */
export const SIGNABLE_UPLOAD_KEYS = [
  "timestamp",
  "folder",
  "public_id",
  "type",
  "context",
  "upload_preset",
] as const;

export type SignableUploadKey = (typeof SIGNABLE_UPLOAD_KEYS)[number];

/** Keys a browser/widget must never ask the signer to honor. */
export const REJECTED_CLIENT_SIGN_KEYS = new Set([
  "eager",
  "eager_async",
  "notification_url",
  "callback",
  "access_control",
  "overwrite",
  "invalidate",
  "moderation",
  "proxy",
  "raw_convert",
  "allowed_formats",
]);

export type UploadContextFields = {
  org_id: string;
  brand_id: string;
  asset_id: string;
  schema_version: typeof UPLOAD_CONTEXT_SCHEMA_VERSION;
  v2_shoot_id?: string;
};

export type SignedUploadParams = {
  timestamp: number;
  folder: string;
  public_id: string;
  type: "authenticated";
  context: string;
  upload_preset?: string;
};

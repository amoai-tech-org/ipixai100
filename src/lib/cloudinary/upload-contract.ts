/**
 * Shared signed-upload context for IPI-1110 (signer) ↔ IPI-1111 (webhook).
 * Field names are frozen — change only with a schema_version bump.
 */
export const UPLOAD_CONTEXT_SCHEMA_VERSION = "1" as const;

/** Unsigned Power Start preset — never for operator DAM uploads. */
export const FORBIDDEN_UPLOAD_PRESETS = new Set(["ai_powerstart"]);

/**
 * Consume-only upload preset owned by IPI-1112 (eager named transforms).
 * IPI-1110 signs with this name only — never create/edit the preset.
 */
export const DEFAULT_SIGNED_UPLOAD_PRESET = "ipix-signed-upload";

export const ALLOWED_SIGNED_UPLOAD_PRESETS = new Set([
  DEFAULT_SIGNED_UPLOAD_PRESET,
]);

/** Params the server may include in the string-to-sign. */
export const SIGNABLE_UPLOAD_KEYS = [
  "timestamp",
  "folder",
  "public_id",
  "type",
  "context",
  "upload_preset",
  "overwrite",
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
  upload_preset: string;
  /** Always signed false — signed uploads default overwrite=true otherwise. */
  overwrite: false;
};

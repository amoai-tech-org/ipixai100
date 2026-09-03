import { randomUUID } from "node:crypto";

import { cloudinary } from "@/lib/cloudinary/config";
import {
  ALLOWED_SIGNED_UPLOAD_PRESETS,
  DEFAULT_SIGNED_UPLOAD_PRESET,
  FORBIDDEN_UPLOAD_PRESETS,
  REJECTED_CLIENT_SIGN_KEYS,
  UPLOAD_CONTEXT_SCHEMA_VERSION,
  type SignedUploadParams,
  type UploadContextFields,
} from "@/lib/cloudinary/upload-contract";

/** Cloudinary signatures expire one hour after timestamp (official docs). */
export const SIGNATURE_MAX_AGE_SECONDS = 3600;
/** Reject client clocks slightly ahead of the server. */
export const SIGNATURE_FUTURE_SKEW_SECONDS = 60;

const SERVER_OWNED_KEYS = new Set([
  "folder",
  "public_id",
  "context",
  "type",
  "org_id",
  "brand_id",
  "v2_shoot_id",
  "asset_id",
  "upload_preset",
  "overwrite",
]);

export function formatUploadContext(fields: UploadContextFields): string {
  const parts = [
    `org_id=${fields.org_id}`,
    `brand_id=${fields.brand_id}`,
    `asset_id=${fields.asset_id}`,
    `schema_version=${fields.schema_version}`,
  ];
  if (fields.v2_shoot_id) parts.push(`v2_shoot_id=${fields.v2_shoot_id}`);
  return parts.join("|");
}

export function deriveUploadFolder(input: {
  orgId: string;
  brandId: string;
  v2ShootId?: string;
}): string {
  const base = `ipix/org/${input.orgId}/brand/${input.brandId}`;
  return input.v2ShootId ? `${base}/shoot/${input.v2ShootId}` : base;
}

export function resolveSignedUploadPreset(
  envPreset: string | undefined = process.env.CLOUDINARY_SIGNED_UPLOAD_PRESET,
):
  | { ok: true; preset: string }
  | { ok: false; reason: "forbidden_preset" | "unknown_preset" } {
  const preset = envPreset?.trim() || DEFAULT_SIGNED_UPLOAD_PRESET;
  if (FORBIDDEN_UPLOAD_PRESETS.has(preset)) {
    return { ok: false, reason: "forbidden_preset" };
  }
  if (!ALLOWED_SIGNED_UPLOAD_PRESETS.has(preset)) {
    return { ok: false, reason: "unknown_preset" };
  }
  return { ok: true, preset };
}

/**
 * next-cloudinary POSTs `{ paramsToSign }`. Reject client security keys;
 * allow a fresh timestamp only.
 */
export function rejectClientSignParams(
  paramsToSign: unknown,
  nowSeconds: number = Math.floor(Date.now() / 1000),
):
  | { ok: true; params: Record<string, unknown> }
  | { ok: false; reason: string } {
  if (paramsToSign == null) return { ok: true, params: {} };
  if (
    typeof paramsToSign !== "object" ||
    Array.isArray(paramsToSign) ||
    paramsToSign === null
  ) {
    return { ok: false, reason: "invalid_paramsToSign" };
  }

  const params = paramsToSign as Record<string, unknown>;
  for (const key of Object.keys(params)) {
    if (REJECTED_CLIENT_SIGN_KEYS.has(key) || SERVER_OWNED_KEYS.has(key)) {
      if (key === "upload_preset") {
        const preset = params[key];
        if (typeof preset === "string" && FORBIDDEN_UPLOAD_PRESETS.has(preset)) {
          return { ok: false, reason: "forbidden_preset" };
        }
      }
      return { ok: false, reason: `unauthorized_param:${key}` };
    }
  }

  if ("timestamp" in params) {
    const raw = params.timestamp;
    const ts =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN;
    if (!Number.isFinite(ts)) return { ok: false, reason: "stale_timestamp" };
    if (ts > nowSeconds + SIGNATURE_FUTURE_SKEW_SECONDS) {
      return { ok: false, reason: "stale_timestamp" };
    }
    if (nowSeconds - ts > SIGNATURE_MAX_AGE_SECONDS) {
      return { ok: false, reason: "stale_timestamp" };
    }
  }

  return { ok: true, params };
}

/** Merge widget paramsToSign with server overrides (server wins). */
export function buildSignedUploadParams(input: {
  orgId: string;
  brandId: string;
  v2ShootId?: string;
  assetId?: string;
  timestamp?: number;
  uploadPreset: string;
  clientParams?: Record<string, unknown>;
}): {
  assetId: string;
  contextFields: UploadContextFields;
  params: SignedUploadParams;
} {
  const assetId = input.assetId ?? randomUUID();
  const clientTs = input.clientParams?.timestamp;
  const timestamp =
    input.timestamp ??
    (typeof clientTs === "number"
      ? clientTs
      : typeof clientTs === "string" && Number.isFinite(Number(clientTs))
        ? Number(clientTs)
        : Math.floor(Date.now() / 1000));

  const contextFields: UploadContextFields = {
    org_id: input.orgId,
    brand_id: input.brandId,
    asset_id: assetId,
    schema_version: UPLOAD_CONTEXT_SCHEMA_VERSION,
    ...(input.v2ShootId ? { v2_shoot_id: input.v2ShootId } : {}),
  };

  // Server overrides always win — never trust client security fields.
  const params: SignedUploadParams = {
    timestamp,
    folder: deriveUploadFolder({
      orgId: input.orgId,
      brandId: input.brandId,
      v2ShootId: input.v2ShootId,
    }),
    public_id: assetId,
    type: "authenticated",
    context: formatUploadContext(contextFields),
    upload_preset: input.uploadPreset,
    overwrite: false,
  };

  return { assetId, contextFields, params };
}

export function signUploadParams(
  params: SignedUploadParams,
  apiSecret: string,
): string {
  return cloudinary.utils.api_sign_request({ ...params }, apiSecret);
}

/** Response for prepareUploadParams / widget. Never includes api_secret. */
export function toSignResponse(input: {
  signature: string;
  params: SignedUploadParams;
  contextFields: UploadContextFields;
  apiKey: string;
  cloudName: string;
}) {
  return {
    signature: input.signature,
    timestamp: input.params.timestamp,
    api_key: input.apiKey,
    cloud_name: input.cloudName,
    folder: input.params.folder,
    public_id: input.params.public_id,
    type: input.params.type,
    context: input.params.context,
    upload_preset: input.params.upload_preset,
    overwrite: false as const,
    org_id: input.contextFields.org_id,
    brand_id: input.contextFields.brand_id,
    asset_id: input.contextFields.asset_id,
    schema_version: input.contextFields.schema_version,
    ...(input.contextFields.v2_shoot_id
      ? { v2_shoot_id: input.contextFields.v2_shoot_id }
      : {}),
  };
}

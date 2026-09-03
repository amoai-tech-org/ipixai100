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

export function formatUploadContext(fields: UploadContextFields): string {
  const parts = [
    `org_id=${fields.org_id}`,
    `brand_id=${fields.brand_id}`,
    `asset_id=${fields.asset_id}`,
    `schema_version=${fields.schema_version}`,
  ];
  if (fields.v2_shoot_id) {
    parts.push(`v2_shoot_id=${fields.v2_shoot_id}`);
  }
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

/**
 * Always returns the IPI-1112 consume-only preset (`ipix-signed-upload`).
 * Env may set `CLOUDINARY_SIGNED_UPLOAD_PRESET` to that exact name; other
 * names (including `ai_powerstart`) fail closed.
 */
export function resolveSignedUploadPreset(
  envPreset: string | undefined = process.env.CLOUDINARY_SIGNED_UPLOAD_PRESET,
):
  | { ok: true; preset: string }
  | { ok: false; reason: "forbidden_preset" | "unknown_preset" } {
  const preset = (envPreset?.trim() || DEFAULT_SIGNED_UPLOAD_PRESET);
  if (FORBIDDEN_UPLOAD_PRESETS.has(preset)) {
    return { ok: false, reason: "forbidden_preset" };
  }
  if (!ALLOWED_SIGNED_UPLOAD_PRESETS.has(preset)) {
    return { ok: false, reason: "unknown_preset" };
  }
  return { ok: true, preset };
}

export function rejectClientSignParams(
  paramsToSign: Record<string, unknown> | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): { ok: true } | { ok: false; reason: string } {
  if (!paramsToSign) return { ok: true };

  for (const key of Object.keys(paramsToSign)) {
    if (REJECTED_CLIENT_SIGN_KEYS.has(key)) {
      return { ok: false, reason: `unauthorized_param:${key}` };
    }
    if (key === "upload_preset") {
      const preset = paramsToSign[key];
      if (typeof preset === "string" && FORBIDDEN_UPLOAD_PRESETS.has(preset)) {
        return { ok: false, reason: "forbidden_preset" };
      }
      // Client must not choose the preset — server env owns it.
      return { ok: false, reason: "unauthorized_param:upload_preset" };
    }
    if (
      key === "folder" ||
      key === "public_id" ||
      key === "context" ||
      key === "type" ||
      key === "org_id" ||
      key === "brand_id" ||
      key === "v2_shoot_id" ||
      key === "asset_id"
    ) {
      return { ok: false, reason: `unauthorized_param:${key}` };
    }
  }

  if ("timestamp" in paramsToSign) {
    const raw = paramsToSign.timestamp;
    const ts =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN;
    if (!Number.isFinite(ts)) {
      return { ok: false, reason: "stale_timestamp" };
    }
    if (ts > nowSeconds + SIGNATURE_FUTURE_SKEW_SECONDS) {
      return { ok: false, reason: "stale_timestamp" };
    }
    if (nowSeconds - ts > SIGNATURE_MAX_AGE_SECONDS) {
      return { ok: false, reason: "stale_timestamp" };
    }
  }

  return { ok: true };
}

export function buildSignedUploadParams(input: {
  orgId: string;
  brandId: string;
  v2ShootId?: string;
  assetId?: string;
  timestamp?: number;
  uploadPreset: string;
}): {
  assetId: string;
  contextFields: UploadContextFields;
  params: SignedUploadParams;
} {
  const assetId = input.assetId ?? randomUUID();
  const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000);
  const contextFields: UploadContextFields = {
    org_id: input.orgId,
    brand_id: input.brandId,
    asset_id: assetId,
    schema_version: UPLOAD_CONTEXT_SCHEMA_VERSION,
    ...(input.v2ShootId ? { v2_shoot_id: input.v2ShootId } : {}),
  };

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
  };

  return { assetId, contextFields, params };
}

export function signUploadParams(
  params: SignedUploadParams,
  apiSecret: string,
): string {
  return cloudinary.utils.api_sign_request(
    { ...params },
    apiSecret,
  );
}

export function publicCloudinaryConfig(): {
  cloudName: string | undefined;
  apiKey: string | undefined;
  apiSecret: string | undefined;
} {
  const cfg = cloudinary.config();
  return {
    cloudName: cfg.cloud_name,
    apiKey: cfg.api_key,
    apiSecret: cfg.api_secret,
  };
}

/** Response payload for prepareUploadParams / direct signed upload. Never includes api_secret. */
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
    org_id: input.contextFields.org_id,
    brand_id: input.contextFields.brand_id,
    asset_id: input.contextFields.asset_id,
    schema_version: input.contextFields.schema_version,
    ...(input.contextFields.v2_shoot_id
      ? { v2_shoot_id: input.contextFields.v2_shoot_id }
      : {}),
  };
}

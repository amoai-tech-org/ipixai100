import { createHash } from "node:crypto";

import {
  readIpixUploadContext,
  type IpixUploadContext,
} from "@/lib/cloudinary/upload-context";

export type CloudinaryWebhookKind =
  | "upload"
  | "overwrite"
  | "rename"
  | "deleted"
  | "ignored";

export type NormalizedCloudinaryEvent = {
  kind: CloudinaryWebhookKind;
  notificationType: string;
  /** Cloudinary immutable provider asset id */
  cloudinaryAssetId: string | null;
  version: number | null;
  publicId: string | null;
  secureUrl: string | null;
  resourceType: string;
  deliveryType: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  format: string | null;
  folder: string | null;
  /** Prefer Cloudinary request_id; else deterministic fallback */
  requestId: string;
  context: IpixUploadContext;
  /** Original parsed body (unknown fields tolerated) */
  raw: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function mapKind(notificationType: string): CloudinaryWebhookKind {
  switch (notificationType) {
    case "upload":
      return "upload";
    case "overwrite":
      return "overwrite";
    case "rename":
      return "rename";
    case "delete":
    case "resource_deleted":
      return "deleted";
    default:
      return "ignored";
  }
}

function pickResource(body: Record<string, unknown>): Record<string, unknown> {
  const resources = body.resources;
  if (Array.isArray(resources) && resources.length > 0) {
    const first = asRecord(resources[0]);
    if (first) return { ...body, ...first };
  }
  return body;
}

function deterministicRequestId(parts: {
  notificationType: string;
  cloudinaryAssetId: string | null;
  version: number | null;
  publicId: string | null;
}): string {
  const material = [
    parts.notificationType,
    parts.cloudinaryAssetId ?? "",
    parts.version == null ? "" : String(parts.version),
    parts.publicId ?? "",
  ].join("|");
  const digest = createHash("sha256").update(material).digest("hex").slice(0, 32);
  return `cld:evt:${digest}`;
}

/**
 * Normalize a verified Cloudinary notification JSON object.
 * Unknown fields are tolerated and kept on `raw`.
 */
export function normalizeCloudinaryNotification(
  body: unknown,
): NormalizedCloudinaryEvent | null {
  const root = asRecord(body);
  if (!root) return null;

  const notificationType =
    asString(root.notification_type) ?? asString(root.notificationType) ?? "unknown";
  const kind = mapKind(notificationType);
  const resource = pickResource(root);

  const cloudinaryAssetId =
    asString(resource.asset_id) ?? asString(resource.assetId);
  const version = asNumber(resource.version);
  const publicId = asString(resource.public_id) ?? asString(resource.publicId);
  const secureUrl =
    asString(resource.secure_url) ??
    asString(resource.secureUrl) ??
    asString(resource.url);
  const resourceType =
    asString(resource.resource_type) ?? asString(resource.resourceType) ?? "image";
  const deliveryType =
    asString(resource.type) ?? asString(resource.delivery_type) ?? "authenticated";

  const context = readIpixUploadContext(resource.context, resource.metadata);

  const requestId =
    asString(root.request_id) ??
    asString(root.requestId) ??
    asString(resource.request_id) ??
    deterministicRequestId({
      notificationType,
      cloudinaryAssetId,
      version,
      publicId,
    });

  return {
    kind,
    notificationType,
    cloudinaryAssetId,
    version,
    publicId,
    secureUrl,
    resourceType,
    deliveryType,
    width: asNumber(resource.width),
    height: asNumber(resource.height),
    bytes: asNumber(resource.bytes),
    format: asString(resource.format),
    folder: asString(resource.folder),
    requestId,
    context,
    raw: root,
  };
}

export type ApplyCloudinaryEventPayload = {
  kind: string;
  cloudinary_asset_id: string | null;
  version: number | null;
  public_id: string | null;
  secure_url: string | null;
  resource_type: string;
  delivery_type: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  format: string | null;
  folder: string | null;
  request_id: string;
  /** Internal iPix `public.assets.id` from signed context (`asset_id`). */
  asset_id: string | null;
  brand_id: string | null;
  org_id: string | null;
  v2_shoot_id: string | null;
};

export function toRpcPayload(
  event: NormalizedCloudinaryEvent,
): ApplyCloudinaryEventPayload {
  return {
    kind: event.kind,
    cloudinary_asset_id: event.cloudinaryAssetId,
    version: event.version,
    public_id: event.publicId,
    secure_url: event.secureUrl,
    resource_type: event.resourceType,
    delivery_type: event.deliveryType,
    width: event.width,
    height: event.height,
    bytes: event.bytes,
    format: event.format,
    folder: event.folder,
    request_id: event.requestId,
    asset_id: event.context.assetId,
    brand_id: event.context.brandId,
    org_id: event.context.orgId,
    v2_shoot_id: event.context.v2ShootId,
  };
}

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

/** Cloudinary immutable provider asset id (`asset_id` on the notification). */
export type CloudinaryProviderAssetId = string;

export type NormalizedCloudinaryEvent = {
  kind: CloudinaryWebhookKind;
  notificationType: string;
  cloudinaryAssetId: CloudinaryProviderAssetId | null;
  version: number | null;
  publicId: string | null;
  secureUrl: string | null;
  /** Null when omitted — RPC must not overwrite with defaults. */
  resourceType: string | null;
  /** Null when omitted — RPC must not overwrite with defaults. */
  deliveryType: string | null;
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

function deterministicRequestId(parts: {
  notificationType: string;
  cloudinaryAssetId: string | null;
  version: number | null;
  publicId: string | null;
  resourceIndex: number;
}): string {
  const material = [
    parts.notificationType,
    parts.cloudinaryAssetId ?? "",
    parts.version == null ? "" : String(parts.version),
    parts.publicId ?? "",
    String(parts.resourceIndex),
  ].join("|");
  const digest = createHash("sha256").update(material).digest("hex").slice(0, 32);
  return `cld:evt:${digest}`;
}

function normalizeResource(
  root: Record<string, unknown>,
  resource: Record<string, unknown>,
  notificationType: string,
  kind: CloudinaryWebhookKind,
  resourceIndex: number,
): NormalizedCloudinaryEvent {
  const cloudinaryAssetId =
    asString(resource.asset_id) ?? asString(resource.assetId);
  const version = asNumber(resource.version);
  const publicId = asString(resource.public_id) ?? asString(resource.publicId);
  const secureUrl =
    asString(resource.secure_url) ??
    asString(resource.secureUrl) ??
    asString(resource.url);
  // Do not invent defaults — partial rename/overwrite must preserve stored values.
  const resourceType =
    asString(resource.resource_type) ?? asString(resource.resourceType);
  const deliveryType =
    asString(resource.type) ?? asString(resource.delivery_type);

  const context = readIpixUploadContext(resource.context, resource.metadata);

  const rootRequestId =
    asString(root.request_id) ?? asString(root.requestId);
  const resourceRequestId = asString(resource.request_id);
  const requestId =
    resourceRequestId ??
    (rootRequestId && resourceIndex === 0
      ? rootRequestId
      : rootRequestId
        ? `${rootRequestId}:${resourceIndex}`
        : deterministicRequestId({
            notificationType,
            cloudinaryAssetId,
            version,
            publicId,
            resourceIndex,
          }));

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

/**
 * Normalize a verified Cloudinary notification into one event per resource.
 * Bulk deletes (`resources[]`) expand to multiple events.
 */
export function normalizeCloudinaryNotifications(
  body: unknown,
): NormalizedCloudinaryEvent[] {
  const root = asRecord(body);
  if (!root) return [];

  const notificationType =
    asString(root.notification_type) ?? asString(root.notificationType) ?? "unknown";
  const kind = mapKind(notificationType);

  if (kind === "ignored") {
    return [
      {
        kind: "ignored",
        notificationType,
        cloudinaryAssetId: null,
        version: null,
        publicId: null,
        secureUrl: null,
        resourceType: null,
        deliveryType: null,
        width: null,
        height: null,
        bytes: null,
        format: null,
        folder: null,
        requestId:
          asString(root.request_id) ??
          asString(root.requestId) ??
          deterministicRequestId({
            notificationType,
            cloudinaryAssetId: null,
            version: null,
            publicId: null,
            resourceIndex: 0,
          }),
        context: {
          assetId: null,
          orgId: null,
          brandId: null,
          v2ShootId: null,
        },
        raw: root,
      },
    ];
  }

  const resources = root.resources;
  if (Array.isArray(resources) && resources.length > 0) {
    const events: NormalizedCloudinaryEvent[] = [];
    // Keep notification-level request_id on `root` only so each resource gets a
    // distinct idempotency key (`request_id` or `request_id:index`).
    const {
      resources: _resources,
      request_id: _requestId,
      requestId: _requestIdCamel,
      ...rootRest
    } = root;
    void _resources;
    void _requestId;
    void _requestIdCamel;
    for (let i = 0; i < resources.length; i++) {
      const item = asRecord(resources[i]);
      if (!item) continue;
      events.push(
        normalizeResource(
          root,
          { ...rootRest, ...item },
          notificationType,
          kind,
          i,
        ),
      );
    }
    return events;
  }

  return [normalizeResource(root, root, notificationType, kind, 0)];
}

/** @deprecated Prefer normalizeCloudinaryNotifications for bulk deletes. */
export function normalizeCloudinaryNotification(
  body: unknown,
): NormalizedCloudinaryEvent | null {
  const events = normalizeCloudinaryNotifications(body);
  return events[0] ?? null;
}

export type ApplyCloudinaryEventPayload = {
  kind: string;
  cloudinary_asset_id: string | null;
  version: number | null;
  public_id: string | null;
  secure_url: string | null;
  resource_type: string | null;
  delivery_type: string | null;
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

/** Outcomes that should 200 (success / permanent noop). */
export const WEBHOOK_OK_OUTCOMES = new Set([
  "applied",
  "archived",
  "noop_duplicate",
  "noop_duplicate_delete",
  "noop_stale",
  "noop_equal_version",
  "noop_ignored_kind",
  "noop_delete_unknown",
  "noop_missing_request_id",
  // Permanent: replay cannot invent a brand that was never in the payload.
  "noop_missing_brand_id",
  "batch_applied",
]);

/**
 * Transient declines that Cloudinary should retry (documented; fail-closed
 * decisions use WEBHOOK_OK_OUTCOMES — unrecognized outcomes also retry).
 */
export const WEBHOOK_RETRY_OUTCOMES = new Set([
  "noop_missing_asset_id",
  "noop_missing_delivery_fields",
  "noop_unknown_brand",
  "noop_missing_provider_id",
]);

/** Fail closed: only explicit OK outcomes are terminal; null/unknown → retry. */
export function outcomeNeedsRetry(outcome: string | null | undefined): boolean {
  if (outcome == null || outcome === "") return true;
  return !WEBHOOK_OK_OUTCOMES.has(outcome);
}

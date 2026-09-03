/**
 * Shared signed-upload context contract for:
 * - IPI-1110 · CLD-SIGN-001 (writes these into Cloudinary context on sign)
 * - IPI-1111 · CLD-WEBHOOK-001 (reads them from verified notification payloads)
 *
 * Cloudinary stores them under `context.custom.<key>` (and may also echo them
 * in structured metadata). Never infer tenant/org from `public_id`.
 */
export const IPIX_UPLOAD_CONTEXT_KEYS = {
  /** Server-minted iPix `public.assets.id` (UUID). Required for upload mirror. */
  ipixAssetId: "ipix_asset_id",
  /** Trusted org UUID resolved server-side at sign time (audit/metadata only). */
  orgId: "org_id",
  /** Brand UUID owned by that org. Required for creating/updating `assets`. */
  brandId: "brand_id",
  /** Optional canonical V2 shoot (`shoot.shoots.id`). */
  v2ShootId: "v2_shoot_id",
} as const;

export type IpixUploadContext = {
  ipixAssetId: string | null;
  orgId: string | null;
  brandId: string | null;
  v2ShootId: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Flatten Cloudinary context / metadata bags into a string map.
 * Tolerates: `{ custom: { k: v } }`, flat `{ k: v }`, and `k=v|k2=v2` strings.
 */
export function flattenContextBag(
  context: unknown,
  metadata?: unknown,
): Record<string, string> {
  const out: Record<string, string> = {};

  const absorb = (value: unknown) => {
    if (value == null) return;
    if (typeof value === "string") {
      for (const part of value.split("|")) {
        const eq = part.indexOf("=");
        if (eq <= 0) continue;
        const k = part.slice(0, eq).trim();
        const v = part.slice(eq + 1).trim();
        if (k && v) out[k] = v;
      }
      return;
    }
    if (typeof value !== "object") return;
    const obj = value as Record<string, unknown>;
    if (obj.custom && typeof obj.custom === "object") {
      absorb(obj.custom);
    }
    for (const [k, v] of Object.entries(obj)) {
      if (k === "custom") continue;
      if (v == null) continue;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        out[k] = String(v);
      }
    }
  };

  absorb(context);
  absorb(metadata);
  return out;
}

export function readIpixUploadContext(
  context: unknown,
  metadata?: unknown,
): IpixUploadContext {
  const flat = flattenContextBag(context, metadata);
  const pick = (key: string): string | null => {
    const raw = flat[key];
    return isUuid(raw) ? raw : null;
  };
  return {
    ipixAssetId: pick(IPIX_UPLOAD_CONTEXT_KEYS.ipixAssetId),
    orgId: pick(IPIX_UPLOAD_CONTEXT_KEYS.orgId),
    brandId: pick(IPIX_UPLOAD_CONTEXT_KEYS.brandId),
    v2ShootId: pick(IPIX_UPLOAD_CONTEXT_KEYS.v2ShootId),
  };
}

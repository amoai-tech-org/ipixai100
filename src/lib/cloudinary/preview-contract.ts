/**
 * IPI-1112 · CLD-DELIVERY-001 — named-transform preview contract.
 * Dashboard already owns `t_asset-*` + eager on `ipix-signed-upload` — do not recreate.
 *
 * Node SDK `transformation: [{ transformation }]` takes the name WITHOUT `t_`.
 * Delivery URLs still use `/t_asset-masonry/` (lock: TRANSFORMS).
 */
export const ASSET_PREVIEW_KINDS = ["masonry", "review", "detail"] as const;

export type AssetPreviewKind = (typeof ASSET_PREVIEW_KINDS)[number];

/** SDK named-transform ids (no `t_`). URL form is `t_<name>`. */
export const PREVIEW_NAMED_TRANSFORMS = {
  masonry: "asset-masonry",
  review: "asset-review",
  detail: "asset-detail",
} as const satisfies Record<AssetPreviewKind, string>;

export const SIGNED_UPLOAD_PRESET = "ipix-signed-upload" as const;
export const AUTHENTICATED_DELIVERY_TYPE = "authenticated" as const;
export const MVP_RESOURCE_TYPE = "image" as const;

export function isAssetPreviewKind(value: unknown): value is AssetPreviewKind {
  return (
    typeof value === "string" &&
    (ASSET_PREVIEW_KINDS as readonly string[]).includes(value)
  );
}

export function namedTransformForPreview(
  preview: AssetPreviewKind,
): (typeof PREVIEW_NAMED_TRANSFORMS)[AssetPreviewKind] {
  return PREVIEW_NAMED_TRANSFORMS[preview];
}

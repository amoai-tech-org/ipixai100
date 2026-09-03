import "server-only";

import { cloudinary } from "@/lib/cloudinary/config";
import {
  AUTHENTICATED_DELIVERY_TYPE,
  MVP_RESOURCE_TYPE,
  namedTransformForPreview,
  type AssetPreviewKind,
} from "@/lib/cloudinary/preview-contract";

export type SignExactVersionPreviewInput = {
  publicId: string;
  version: number;
  preview: AssetPreviewKind;
  format?: string | null;
};

/**
 * Official Node SDK signed authenticated delivery URL for one allowlisted
 * named transform + exact provider version. No arbitrary transform strings.
 */
export function signExactVersionPreviewUrl(
  input: SignExactVersionPreviewInput,
): string {
  if (!Number.isFinite(input.version) || input.version <= 0) {
    throw new Error("invalid_cloudinary_version");
  }

  return cloudinary.url(input.publicId, {
    resource_type: MVP_RESOURCE_TYPE,
    type: AUTHENTICATED_DELIVERY_TYPE,
    version: input.version,
    sign_url: true,
    secure: true,
    ...(input.format ? { format: input.format } : {}),
    transformation: [{ transformation: namedTransformForPreview(input.preview) }],
  });
}

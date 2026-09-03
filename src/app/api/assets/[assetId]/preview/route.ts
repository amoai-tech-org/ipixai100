import { getVerifiedOperatorForRequest } from "@/lib/auth/copilot-hooks";
import {
  forbiddenResponse,
  membershipLookupFailedResponse,
  unauthorizedResponse,
} from "@/lib/auth/unauthorized";
import { getAuthorizedAssetPreview } from "@/lib/cloudinary/get-authorized-asset-preview";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";

function jsonError(
  status: number,
  error: string,
  reason: string,
): Response {
  return new Response(JSON.stringify({ error, reason }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * IPI-1112 · CLD-DELIVERY-001 — org-safe signed preview URL.
 * Query: ?preview=masonry|review|detail
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ assetId: string }> },
): Promise<Response> {
  const operator = await getVerifiedOperatorForRequest(request);
  if (!operator) return unauthorizedResponse();

  const supabase = createClientFromRequest(request);
  if (!supabase) return unauthorizedResponse();

  const { assetId } = await context.params;
  const preview = new URL(request.url).searchParams.get("preview");

  const result = await getAuthorizedAssetPreview({
    assetId,
    preview,
    operator,
    supabase: supabase as never,
  });

  if (!result.ok) {
    switch (result.reason) {
      case "unsupported_preview":
      case "invalid_asset_id":
        return jsonError(400, "bad_request", result.reason);
      case "membership_lookup_failed":
      case "lookup_failed":
        return membershipLookupFailedResponse();
      case "needs_onboarding":
      case "needs_org_selection":
        return forbiddenResponse(result.reason);
      case "foreign_org":
        return jsonError(403, "forbidden", "foreign_org");
      case "asset_not_found":
      case "missing_cloudinary_mirror":
        return jsonError(404, "not_found", result.reason);
      case "invalid_delivery_type":
      case "invalid_cloudinary_version":
      case "unsupported_resource_type":
        // Data-integrity / MVP mismatch — not a client validation error.
        return jsonError(409, "conflict", result.reason);
      default: {
        const _exhaustive: never = result.reason;
        return jsonError(500, "internal", String(_exhaustive));
      }
    }
  }

  return Response.json({
    url: result.url,
    assetId: result.assetId,
    preview: result.preview,
    namedTransform: result.namedTransform,
    version: result.version,
    publicId: result.publicId,
  });
}

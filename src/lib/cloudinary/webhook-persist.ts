import "server-only";

import type { ApplyCloudinaryEventPayload } from "@/lib/cloudinary/webhook-normalize";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ApplyCloudinaryEventResult = {
  outcome: string;
  asset_id?: string | null;
  cloudinary_asset_id?: string | null;
  version?: number | null;
};

/**
 * Call the transactional SECURITY DEFINER RPC that upserts the provider mirror
 * and inserts an idempotent asset_event.
 */
export async function applyCloudinaryAssetEvent(
  payload: ApplyCloudinaryEventPayload,
): Promise<
  | { ok: true; result: ApplyCloudinaryEventResult }
  | { ok: false; status: 503; error: string }
> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, status: 503, error: "service_role_unavailable" };
  }

  const { data, error } = await supabase.rpc("apply_cloudinary_asset_event", {
    p_event: payload,
  });

  if (error) {
    return { ok: false, status: 503, error: error.message || "rpc_failed" };
  }

  const result = (data ?? { outcome: "ok" }) as ApplyCloudinaryEventResult;
  return { ok: true, result };
}

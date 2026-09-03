import "server-only";

import type { ApplyCloudinaryEventPayload } from "@/lib/cloudinary/webhook-normalize";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ApplyCloudinaryEventResult = {
  outcome: string;
  asset_id?: string | null;
  cloudinary_asset_id?: string | null;
  version?: number | null;
  results?: ApplyCloudinaryEventResult[];
  count?: number;
};

export type ApplyCloudinaryEventsResult = {
  outcome: string;
  count?: number;
  results: ApplyCloudinaryEventResult[];
};

/**
 * Call the transactional SECURITY DEFINER batch RPC that mirrors events
 * (idempotency-first state machine) in one transaction.
 */
export async function applyCloudinaryAssetEvents(
  payloads: ApplyCloudinaryEventPayload[],
): Promise<
  | { ok: true; result: ApplyCloudinaryEventsResult }
  | { ok: false; status: 503; error: string }
> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, status: 503, error: "service_role_unavailable" };
  }

  const { data, error } = await supabase.rpc("apply_cloudinary_asset_events", {
    p_events: payloads,
  });

  if (error) {
    return { ok: false, status: 503, error: error.message || "rpc_failed" };
  }

  const raw = (data ?? { outcome: "batch_applied", results: [] }) as {
    outcome?: string;
    count?: number;
    results?: ApplyCloudinaryEventResult[];
  };

  return {
    ok: true,
    result: {
      outcome: raw.outcome ?? "batch_applied",
      count: raw.count,
      results: Array.isArray(raw.results) ? raw.results : [],
    },
  };
}

/** @deprecated Prefer applyCloudinaryAssetEvents for batch notifications. */
export async function applyCloudinaryAssetEvent(
  payload: ApplyCloudinaryEventPayload,
): Promise<
  | { ok: true; result: ApplyCloudinaryEventResult }
  | { ok: false; status: 503; error: string }
> {
  const batch = await applyCloudinaryAssetEvents([payload]);
  if (!batch.ok) return batch;
  const first = batch.result.results[0] ?? { outcome: "ok" };
  return { ok: true, result: first };
}

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

/** Bound hung PostgREST RPC so Cloudinary can retry instead of hanging. */
const RPC_TIMEOUT_MS = 10_000;

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

  const { data, error } = await supabase
    .rpc("apply_cloudinary_asset_events", {
      p_events: payloads,
    })
    .abortSignal(AbortSignal.timeout(RPC_TIMEOUT_MS));

  if (error) {
    return { ok: false, status: 503, error: error.message || "rpc_failed" };
  }

  // Fail closed: never invent a successful batch when DB returned nothing.
  if (data == null) {
    return { ok: false, status: 503, error: "rpc_empty_result" };
  }

  const raw = data as {
    outcome?: unknown;
    count?: number;
    results?: unknown;
  };

  if (typeof raw.outcome !== "string" || raw.outcome.length === 0) {
    return { ok: false, status: 503, error: "rpc_malformed_outcome" };
  }

  if (!Array.isArray(raw.results)) {
    return { ok: false, status: 503, error: "rpc_malformed_results" };
  }

  return {
    ok: true,
    result: {
      outcome: raw.outcome,
      count: raw.count,
      results: raw.results as ApplyCloudinaryEventResult[],
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
  const first = batch.result.results[0];
  if (!first || typeof first.outcome !== "string" || first.outcome.length === 0) {
    return { ok: false, status: 503, error: "rpc_empty_result" };
  }
  return { ok: true, result: first };
}

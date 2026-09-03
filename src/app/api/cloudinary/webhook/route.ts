import {
  normalizeCloudinaryNotification,
  toRpcPayload,
} from "@/lib/cloudinary/webhook-normalize";
import { applyCloudinaryAssetEvent } from "@/lib/cloudinary/webhook-persist";
import { verifyCloudinaryNotification } from "@/lib/cloudinary/webhook-verify";

export const runtime = "nodejs";

/**
 * Cloudinary notification webhook (IPI-1111 · CLD-WEBHOOK-001).
 *
 * Do NOT retarget production notification URLs here — cutover is IPI-1115.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  const verified = verifyCloudinaryNotification({
    rawBody,
    timestampHeader: request.headers.get("x-cld-timestamp"),
    signatureHeader: request.headers.get("x-cld-signature"),
    signatureV2Header: request.headers.get("x-cld-signature_v2"),
  });

  if (!verified.ok) {
    return Response.json({ error: "unauthorized", reason: verified.reason }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    // Signature matched but body is not JSON — permanent no-op for retries.
    return Response.json({ ok: true, outcome: "noop_invalid_json" }, { status: 200 });
  }

  const event = normalizeCloudinaryNotification(parsed);
  if (!event) {
    return Response.json({ ok: true, outcome: "noop_unrecognized" }, { status: 200 });
  }

  if (event.kind === "ignored") {
    return Response.json(
      { ok: true, outcome: "noop_ignored", notification_type: event.notificationType },
      { status: 200 },
    );
  }

  const applied = await applyCloudinaryAssetEvent(toRpcPayload(event));
  if (!applied.ok) {
    return Response.json(
      { error: "persistence_failed", detail: applied.error },
      { status: 503 },
    );
  }

  return Response.json(
    { ok: true, outcome: applied.result.outcome, result: applied.result },
    { status: 200 },
  );
}

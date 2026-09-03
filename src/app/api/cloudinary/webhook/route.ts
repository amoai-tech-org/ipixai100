import {
  normalizeCloudinaryNotifications,
  outcomeNeedsRetry,
  toRpcPayload,
} from "@/lib/cloudinary/webhook-normalize";
import { applyCloudinaryAssetEvents } from "@/lib/cloudinary/webhook-persist";
import { verifyCloudinaryNotification } from "@/lib/cloudinary/webhook-verify";

export const runtime = "nodejs";

/** Bound raw body before verify/parse (Cloudinary notifications are small). */
const MAX_BODY_BYTES = 1_048_576;

/**
 * Cloudinary notification webhook (IPI-1111 · CLD-WEBHOOK-001).
 *
 * Do NOT retarget production notification URLs here — cutover is IPI-1115.
 */
export async function POST(request: Request) {
  const contentLength = request.headers.get("content-length");
  if (contentLength != null) {
    const n = Number(contentLength);
    if (Number.isFinite(n) && n > MAX_BODY_BYTES) {
      return Response.json({ error: "payload_too_large" }, { status: 413 });
    }
  }

  const rawBody = await request.text();
  // Measure UTF-8 bytes (not JS string length / UTF-16 code units).
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return Response.json({ error: "payload_too_large" }, { status: 413 });
  }

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

  const events = normalizeCloudinaryNotifications(parsed);
  if (events.length === 0) {
    return Response.json({ ok: true, outcome: "noop_unrecognized" }, { status: 200 });
  }

  if (events.every((e) => e.kind === "ignored")) {
    return Response.json(
      {
        ok: true,
        outcome: "noop_ignored",
        notification_type: events[0]?.notificationType,
      },
      { status: 200 },
    );
  }

  const actionable = events.filter((e) => e.kind !== "ignored");
  const applied = await applyCloudinaryAssetEvents(actionable.map(toRpcPayload));
  if (!applied.ok) {
    return Response.json(
      { error: "persistence_failed", detail: applied.error },
      { status: 503 },
    );
  }

  const results = applied.result.results;
  // Fail closed: batch or any per-event outcome must be an explicit OK terminal.
  const needsRetry =
    outcomeNeedsRetry(applied.result.outcome) ||
    results.length === 0 ||
    results.some((r) => outcomeNeedsRetry(r?.outcome));
  if (needsRetry) {
    return Response.json(
      {
        error: "persistence_declined",
        outcome: applied.result.outcome,
        results,
      },
      { status: 503 },
    );
  }

  return Response.json(
    {
      ok: true,
      outcome: applied.result.outcome,
      count: applied.result.count ?? results.length,
      results,
    },
    { status: 200 },
  );
}

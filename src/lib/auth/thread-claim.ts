import {
  getMastraPgPool,
  isMastraHostedRuntime,
  requireMastraPostgresUrl,
} from "@/mastra/pg-store";
import { THREAD_ID } from "@/mastra/thread-persistence";

export type ThreadClaimDecision =
  | { status: "owned"; resourceId: string }
  | { status: "forbidden"; resourceId: string }
  | { status: "unavailable" }
  | { status: "invalid" };

export type ClaimSql = {
  query: (
    text: string,
    values: string[],
  ) => Promise<{ rows: Array<{ resource_id: string }> }>;
};

export const CLAIM_INSERT_SQL = `INSERT INTO planner.planner_thread_claims (thread_id, resource_id)
VALUES ($1::uuid, $2)
ON CONFLICT (thread_id) DO NOTHING
RETURNING resource_id`;

export const CLAIM_SELECT_SQL = `SELECT resource_id FROM planner.planner_thread_claims WHERE thread_id = $1::uuid`;

export function isClaimableThreadId(threadId: unknown): threadId is string {
  return typeof threadId === "string" && THREAD_ID.test(threadId);
}

export function routeNeedsFirstCreateClaim(method: string): boolean {
  return method === "agent/run" || method === "agent/connect";
}

export async function claimPlannerThread(
  input: { threadId: unknown; resourceId: string },
  sql?: ClaimSql,
): Promise<ThreadClaimDecision> {
  if (!isClaimableThreadId(input.threadId)) {
    if (sql || isMastraHostedRuntime()) return { status: "invalid" };
    return { status: "owned", resourceId: input.resourceId };
  }
  if (typeof input.resourceId !== "string" || input.resourceId.length === 0) {
    return { status: "invalid" };
  }

  let client = sql;
  try {
    if (!client) {
      const url = requireMastraPostgresUrl();
      if (!url) {
        return isMastraHostedRuntime()
          ? { status: "unavailable" }
          : { status: "owned", resourceId: input.resourceId };
      }
      const pool = getMastraPgPool(url);
      client = {
        query: (text, values) => pool.query(text, values),
      };
    }

    const inserted = await client.query(CLAIM_INSERT_SQL, [
      input.threadId,
      input.resourceId,
    ]);
    const winner = inserted.rows[0]?.resource_id;
    if (winner) {
      return winner === input.resourceId
        ? { status: "owned", resourceId: winner }
        : { status: "forbidden", resourceId: winner };
    }

    const existing = await client.query(CLAIM_SELECT_SQL, [input.threadId]);
    const owner = existing.rows[0]?.resource_id;
    if (!owner) return { status: "unavailable" };
    return owner === input.resourceId
      ? { status: "owned", resourceId: owner }
      : { status: "forbidden", resourceId: owner };
  } catch {
    return { status: "unavailable" };
  }
}

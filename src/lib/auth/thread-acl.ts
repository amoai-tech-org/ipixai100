import { getPlannerMemory } from "@/mastra/thread-persistence";

import { forbiddenResponse } from "./unauthorized";

/** Opaque CopilotKit thread locators (UUIDs in the planner UI; tests may use tokens). */
const COPILOT_THREAD_ID = /^[\w.:-]{1,200}$/;

export type ThreadOwnerLookup =
  | { status: "owned"; resourceId: string }
  | { status: "not_found" }
  | { status: "unowned" }
  | { status: "lookup_failed" };

export type ThreadAccessDecision = { ok: true } | { ok: false };

export function isUsableThreadId(threadId: unknown): threadId is string {
  return typeof threadId === "string" && COPILOT_THREAD_ID.test(threadId);
}

export function threadForbiddenResponse(): Response {
  return forbiddenResponse("thread_forbidden");
}

export function routeNeedsThreadAcl(method: string): boolean {
  return (
    method === "agent/run" ||
    method === "agent/connect" ||
    method === "agent/stop" ||
    method === "threads/update" ||
    method === "threads/archive" ||
    method === "threads/messages" ||
    method === "threads/events" ||
    method === "threads/state" ||
    method === "threads/clear"
  );
}

export function routeAllowsMissingThread(method: string): boolean {
  return (
    method === "agent/run" ||
    method === "agent/connect" ||
    method === "agent/stop"
  );
}

/** threadId locates; stored Mastra resourceId authorizes. */
export function authorizeThreadAccess(input: {
  threadId: unknown;
  callerResourceId: string;
  owner: ThreadOwnerLookup;
  allowMissing: boolean;
}): ThreadAccessDecision {
  if (!isUsableThreadId(input.threadId)) return { ok: false };
  if (input.owner.status === "owned") {
    return input.owner.resourceId === input.callerResourceId
      ? { ok: true }
      : { ok: false };
  }
  // run/connect/stop: missing or lookup failure is not a foreign-owner denial.
  // The runner still fail-closes (memory_unavailable / pending Stop).
  if (
    input.allowMissing &&
    (input.owner.status === "not_found" ||
      input.owner.status === "lookup_failed")
  ) {
    return { ok: true };
  }
  return { ok: false };
}

export async function loadThreadOwner(
  threadId: string,
): Promise<ThreadOwnerLookup> {
  try {
    const memory = await getPlannerMemory();
    if (!memory) return { status: "lookup_failed" };
    const thread = await memory.getThreadById({ threadId });
    if (!thread) return { status: "not_found" };
    const resourceId = thread.resourceId;
    return typeof resourceId === "string" && resourceId.length > 0
      ? { status: "owned", resourceId }
      : { status: "unowned" };
  } catch {
    return { status: "lookup_failed" };
  }
}

export async function threadIdFromRequest(
  request: Request,
): Promise<unknown> {
  try {
    const body = (await request.clone().json()) as { threadId?: unknown };
    return body?.threadId;
  } catch {
    return undefined;
  }
}

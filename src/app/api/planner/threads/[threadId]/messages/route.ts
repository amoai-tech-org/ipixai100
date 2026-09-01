import { requirePlannerResourceId } from "@/lib/auth/planner-session";
import {
  loadThreadOwner,
  threadForbiddenResponse,
} from "@/lib/auth/thread-acl";
import {
  THREAD_ID,
  getPlannerMemory,
  recallPlannerChatMessages,
} from "@/mastra/thread-persistence";

export async function GET(
  request: Request,
  context: { params: Promise<{ threadId: string }> },
) {
  const session = await requirePlannerResourceId(request);
  if (!session.ok) return session.response;

  const { threadId } = await context.params;
  if (!THREAD_ID.test(threadId)) {
    return Response.json({ error: "invalid_thread" }, { status: 400 });
  }

  let memory;
  try {
    memory = await getPlannerMemory();
  } catch {
    return Response.json({ error: "memory_unavailable" }, { status: 503 });
  }
  if (!memory) {
    return Response.json({ error: "memory_unavailable" }, { status: 503 });
  }

  const owner = await loadThreadOwner(threadId);
  if (
    owner.status !== "owned" ||
    owner.resourceId !== session.resourceId
  ) {
    return threadForbiddenResponse();
  }

  const messages = await recallPlannerChatMessages(memory, {
    threadId,
    resourceId: session.resourceId,
  });
  return Response.json({ threadId, messages });
}

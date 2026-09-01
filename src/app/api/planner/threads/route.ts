import { requirePlannerResourceId } from "@/lib/auth/planner-session";
import {
  getPlannerMemory,
  listMastraThreadsForResource,
} from "@/mastra/thread-persistence";

export async function GET(request: Request) {
  const session = await requirePlannerResourceId(request);
  if (!session.ok) return session.response;

  const memory = await getPlannerMemory();
  if (!memory) {
    return Response.json({ error: "memory_unavailable" }, { status: 503 });
  }

  const threads = await listMastraThreadsForResource(memory, session.resourceId);
  return Response.json({ resourceId: session.resourceId, threads });
}

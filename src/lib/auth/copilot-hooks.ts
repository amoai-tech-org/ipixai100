import type { CopilotRuntimeHooks } from "@copilotkit/runtime/v2";

import {
  authorizeThreadAccess,
  loadThreadOwner,
  routeAllowsMissingThread,
  routeNeedsThreadAcl,
  threadForbiddenResponse,
  threadIdFromRequest,
} from "./thread-acl";
import { unauthorizedResponse } from "./unauthorized";
import {
  claimsFromSupabaseResult,
  getVerifiedOperatorFromClaims,
} from "./verified-operator";
import { createClient, createClientFromRequest } from "@/lib/supabase/server";

export async function getVerifiedOperatorForRequest(request: Request) {
  const supabase = createClientFromRequest(request);
  if (!supabase) return null;
  return getVerifiedOperatorFromClaims({
    request,
    getClaims: async () =>
      claimsFromSupabaseResult(await supabase.auth.getClaims()),
  });
}

export async function getVerifiedOperatorFromCookies() {
  const supabase = await createClient();
  if (!supabase) return null;
  return getVerifiedOperatorFromClaims({
    getClaims: async () =>
      claimsFromSupabaseResult(await supabase.auth.getClaims()),
  });
}

export async function identifyOperator(request: Request) {
  const operator = await getVerifiedOperatorForRequest(request);
  if (!operator) throw unauthorizedResponse();
  return operator;
}

export const copilotAuthHooks: CopilotRuntimeHooks = {
  onRequest: async ({ request }) => {
    const operator = await getVerifiedOperatorForRequest(request);
    if (!operator) throw unauthorizedResponse();
  },
  onBeforeHandler: async ({ request, route }) => {
    if (!routeNeedsThreadAcl(route.method)) return;
    if (route.method === "threads/clear") throw threadForbiddenResponse();

    const threadId =
      "threadId" in route
        ? route.threadId
        : await threadIdFromRequest(request);
    if (threadId === undefined || threadId === null) {
      if (routeAllowsMissingThread(route.method)) return;
      throw threadForbiddenResponse();
    }

    const { requirePlannerResourceId } = await import("./planner-session");
    const session = await requirePlannerResourceId(request);
    if (!session.ok) throw session.response;

    const owner = await loadThreadOwner(String(threadId));
    const decision = authorizeThreadAccess({
      threadId,
      callerResourceId: session.resourceId,
      owner,
      allowMissing: routeAllowsMissingThread(route.method),
    });
    if (!decision.ok) throw threadForbiddenResponse();
  },
};

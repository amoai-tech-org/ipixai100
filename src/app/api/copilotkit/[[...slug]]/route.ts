import {
  CopilotRuntime,
  CopilotKitIntelligence,
  createCopilotEndpoint,
  InMemoryAgentRunner,
} from "@copilotkit/runtime/v2";
import { createLocalAgents } from "@/agent";
import {
  copilotAuthHooks,
  getVerifiedOperatorForRequest,
  identifyOperator,
} from "@/lib/auth/copilot-hooks";
import { memoryResourceId } from "@/lib/auth/verified-operator";
import {
  listMembershipOrgIdsFromServerClient,
  resolveRuntimeTenant,
  runtimeTenantDenied,
} from "@/lib/auth/runtime-org";
import { unauthorizedResponse } from "@/lib/auth/unauthorized";
import { createClientFromRequest } from "@/lib/supabase/server";
import { handle } from "hono/vercel";

async function handleCopilot(request: Request) {
  const operator = await getVerifiedOperatorForRequest(request);
  if (!operator) return unauthorizedResponse();

  const supabase = createClientFromRequest(request);
  if (!supabase) return unauthorizedResponse();

  const tenant = await resolveRuntimeTenant({
    listOrgIds: () => listMembershipOrgIdsFromServerClient(supabase, operator.id),
  });
  if (tenant.status !== "ok") return runtimeTenantDenied(tenant);

  const app = createCopilotEndpoint({
    runtime: new CopilotRuntime({
      agents: createLocalAgents(
        memoryResourceId({ userId: operator.id, orgId: tenant.orgId }),
      ),
      identifyUser: identifyOperator,
      // --- copilotkit:intelligence (remove this block to opt out) ---
      ...(process.env.COPILOTKIT_LICENSE_TOKEN
        ? {
            intelligence: new CopilotKitIntelligence({
              apiKey: process.env.INTELLIGENCE_API_KEY ?? "",
              apiUrl: process.env.INTELLIGENCE_API_URL ?? "http://localhost:4201",
              wsUrl:
                process.env.INTELLIGENCE_GATEWAY_WS_URL ?? "ws://localhost:4401",
            }),
            licenseToken: process.env.COPILOTKIT_LICENSE_TOKEN,
          }
        : { runner: new InMemoryAgentRunner() }),
      // --- /copilotkit:intelligence ---
    }),
    basePath: "/api/copilotkit",
    hooks: copilotAuthHooks,
  });

  return handle(app)(request);
}

export const GET = handleCopilot;
export const POST = handleCopilot;
export const PATCH = handleCopilot;
export const DELETE = handleCopilot;

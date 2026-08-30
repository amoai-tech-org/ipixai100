import {
  CopilotRuntime,
  CopilotKitIntelligence,
  createCopilotEndpoint,
  InMemoryAgentRunner,
} from "@copilotkit/runtime/v2";
import type { AbstractAgent } from "@ag-ui/client";
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

/**
 * Mastra local agents inherit AbstractAgent.abortRun() as a no-op.
 * CopilotKit clones the registered agent per /run (`cloneAgentForRequest`);
 * clone() is Object.create(prototype) and drops instance abortRun.
 * UI Stop → POST /stop → InMemoryAgentRunner.stop → stored clone.abortRun().
 * detachActiveRun() completes the runAgent takeUntil, which ends the SSE.
 */
function wrapAbortRun(agent: AbstractAgent): AbstractAgent {
  const previousAbort = agent.abortRun.bind(agent);
  agent.abortRun = () => {
    previousAbort();
    void agent.detachActiveRun();
  };
  const previousClone = agent.clone.bind(agent);
  agent.clone = () => wrapAbortRun(previousClone());
  return agent;
}

function attachRunnerAbort(agents: Record<string, AbstractAgent>) {
  for (const [id, agent] of Object.entries(agents)) {
    agents[id] = wrapAbortRun(agent);
  }
  return agents;
}

/** CopilotKit already drops SSE writes on `request.signal`, but InMemoryAgentRunner keeps generating until `runner.stop`. */
function stopRunnerOnAbort(request: Request, runner: InMemoryAgentRunner) {
  const peek = request.clone();
  const stop = () => {
    void peek
      .json()
      .then((body: unknown) => {
        if (!body || typeof body !== "object") return;
        const threadId = (body as { threadId?: unknown }).threadId;
        const runId = (body as { runId?: unknown }).runId;
        if (typeof threadId !== "string") return;
        return runner.stop({
          threadId,
          ...(typeof runId === "string" ? { runId } : {}),
        });
      })
      .catch(() => undefined);
  };
  if (request.signal.aborted) {
    stop();
    return;
  }
  request.signal.addEventListener("abort", stop, { once: true });
}

async function handleCopilot(request: Request) {
  const operator = await getVerifiedOperatorForRequest(request);
  if (!operator) return unauthorizedResponse();

  const supabase = createClientFromRequest(request);
  if (!supabase) return unauthorizedResponse();

  const tenant = await resolveRuntimeTenant({
    listOrgIds: () => listMembershipOrgIdsFromServerClient(supabase, operator.id),
  });
  if (tenant.status !== "ok") return runtimeTenantDenied(tenant);

  const agents = attachRunnerAbort(
    createLocalAgents(
      memoryResourceId({ userId: operator.id, orgId: tenant.orgId }),
    ),
  );
  const licenseToken = process.env.COPILOTKIT_LICENSE_TOKEN;
  const runtime = licenseToken
    ? new CopilotRuntime({
        agents,
        identifyUser: identifyOperator,
        // --- copilotkit:intelligence (remove this block to opt out) ---
        intelligence: new CopilotKitIntelligence({
          apiKey: process.env.INTELLIGENCE_API_KEY ?? "",
          apiUrl: process.env.INTELLIGENCE_API_URL ?? "http://localhost:4201",
          wsUrl:
            process.env.INTELLIGENCE_GATEWAY_WS_URL ?? "ws://localhost:4401",
        }),
        licenseToken,
        // --- /copilotkit:intelligence ---
      })
    : (() => {
        const runner = new InMemoryAgentRunner();
        stopRunnerOnAbort(request, runner);
        return new CopilotRuntime({
          agents,
          identifyUser: identifyOperator,
          runner,
        });
      })();

  const app = createCopilotEndpoint({
    runtime,
    basePath: "/api/copilotkit",
    hooks: copilotAuthHooks,
  });

  return handle(app)(request);
}

export const GET = handleCopilot;
export const POST = handleCopilot;
export const PATCH = handleCopilot;
export const DELETE = handleCopilot;

import {
  CopilotRuntime,
  CopilotKitIntelligence,
  createCopilotEndpoint,
  InMemoryAgentRunner,
} from "@copilotkit/runtime/v2";
import type { AbstractAgent, BaseEvent } from "@ag-ui/client";
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
import { Observable } from "rxjs";

import {
  ensureMastraThread,
  getPlannerMemory,
  splitRunThreadIds,
} from "@/mastra/thread-persistence";

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

/**
 * Process-global InMemoryAgentRunner is keyed by threadId only. Prefix with the
 * AUTH-002 resourceId so /stop cannot cancel another org/user's run.
 * Bind abort on run() after the store registers the thread (not a one-shot body peek).
 */
class TenantAbortRunner extends InMemoryAgentRunner {
  constructor(
    private readonly resourceId: string,
    private readonly signal: AbortSignal,
  ) {
    super();
  }

  private scope(threadId: string) {
    return splitRunThreadIds(this.resourceId, threadId).runnerThreadId;
  }

  override run(request: Parameters<InMemoryAgentRunner["run"]>[0]) {
    const { runnerThreadId, mastraThreadId } = splitRunThreadIds(
      this.resourceId,
      request.threadId,
    );
    const input = request.input
      ? { ...request.input, threadId: mastraThreadId }
      : request.input;
    const agent = request.agent;
    const runAgent = agent.runAgent.bind(agent);
    agent.runAgent = (runInput, subscribers) => {
      if (this.signal.aborted) {
        agent.abortRun();
        return Promise.resolve({ result: undefined, newMessages: [] });
      }
      this.signal.addEventListener(
        "abort",
        () => {
          agent.abortRun();
        },
        { once: true },
      );
      return runAgent(runInput, subscribers);
    };
    return new Observable<BaseEvent>((subscriber) => {
      let inner: { unsubscribe: () => void } | undefined;
      let cancelled = false;
      void (async () => {
        const memory = await getPlannerMemory();
        if (memory) {
          await ensureMastraThread(memory, {
            threadId: mastraThreadId,
            resourceId: this.resourceId,
          });
        }
        if (cancelled) return;
        inner = super
          .run({ ...request, threadId: runnerThreadId, input })
          .subscribe(subscriber);
      })().catch((error) => {
        if (!cancelled) subscriber.error(error);
      });
      return () => {
        cancelled = true;
        inner?.unsubscribe();
      };
    });
  }

  override stop(request: Parameters<InMemoryAgentRunner["stop"]>[0]) {
    return super.stop({ ...request, threadId: this.scope(request.threadId) });
  }

  override connect(request: Parameters<InMemoryAgentRunner["connect"]>[0]) {
    return super.connect({
      ...request,
      threadId: this.scope(request.threadId),
    });
  }

  override isRunning(request: Parameters<InMemoryAgentRunner["isRunning"]>[0]) {
    return super.isRunning({ threadId: this.scope(request.threadId) });
  }

  override getThreadMessages(threadId: string) {
    return super.getThreadMessages(this.scope(threadId));
  }

  override getThreadEvents(threadId: string) {
    return super.getThreadEvents(this.scope(threadId));
  }

  override getThreadState(threadId: string) {
    return super.getThreadState(this.scope(threadId));
  }

  override listThreads() {
    const prefix = splitRunThreadIds(this.resourceId, "").runnerThreadId;
    return super
      .listThreads()
      .filter((thread) => thread.id.startsWith(prefix))
      .map((thread) => ({ ...thread, id: thread.id.slice(prefix.length) }));
  }
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

  const resourceId = memoryResourceId({
    userId: operator.id,
    orgId: tenant.orgId,
  });
  const agents = attachRunnerAbort(createLocalAgents(resourceId));
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
    : new CopilotRuntime({
        agents,
        identifyUser: identifyOperator,
        runner: new TenantAbortRunner(resourceId, request.signal),
      });

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

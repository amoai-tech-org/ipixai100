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
import { unauthorizedResponse } from "@/lib/auth/unauthorized";
import { handle } from "hono/vercel";

async function handleCopilot(request: Request) {
  const operator = await getVerifiedOperatorForRequest(request);
  if (!operator) return unauthorizedResponse();

  const app = createCopilotEndpoint({
    runtime: new CopilotRuntime({
      agents: createLocalAgents(memoryResourceId(operator.id)),
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

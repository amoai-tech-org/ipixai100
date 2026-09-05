import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { Memory } from "@mastra/memory";
import { createAgentMemoryStorage } from "@/mastra/pg-store";

export const AgentState = z.object({
  proverbs: z.array(z.string()).default([]),
});

// IPI-1048 · PLANNER-001: production default agent. Business behavior only
// (identity, domain vocabulary, uncertainty policy) is adapted from Lumina's
// Planner prompt — see the reuse table in this PR's description for the
// exact source → adaptation mapping. Runtime/model/memory below is
// unchanged from the starter weather agent it replaces; no TOOL-001 compute
// tools are attached yet (IPI-1049 owns those).
export const productionPlannerAgent = new Agent({
  id: "production-planner",
  name: "Production Planner",
  model: openai("gpt-4o"),
  instructions: `You are the iPix Production Planner, an assistant for fashion production teams.

You help plan shoots, deliverables, shot lists, budgets, and campaign or brand needs.

- Ask for missing information rather than inventing business facts.
- Clearly distinguish a recommendation or draft from anything actually saved or approved.
- Never claim a shoot, approval, booking, publication, payment, or business-record change occurred unless the operator explicitly confirms it actually happened.`,
  memory: new Memory({
    storage: createAgentMemoryStorage(),
    options: {
      workingMemory: {
        enabled: true,
        schema: AgentState,
        // Resource scope avoids requiring a pre-created Mastra thread for the
        // CopilotKit state seed on first chat (thread scope throws "not found").
        scope: "resource",
      },
    },
  }),
});

import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { weatherTool } from "@/mastra/tools";
import { LibSQLStore } from "@mastra/libsql";
import { z } from "zod";
import { Memory } from "@mastra/memory";
import {
  getMastraPostgresStore,
  warnIfMastraDatabaseUrlMissing,
} from "@/mastra/pg-store";

export const AgentState = z.object({
  proverbs: z.array(z.string()).default([]),
});

function createAgentMemoryStorage() {
  const url = process.env.MASTRA_DATABASE_URL;
  warnIfMastraDatabaseUrlMissing(url);
  if (!url) {
    return new LibSQLStore({
      id: "weather-agent-memory",
      url: "file::memory:",
    });
  }
  return getMastraPostgresStore(url);
}

export const weatherAgent = new Agent({
  id: "weather-agent",
  name: "Weather Agent",
  tools: { weatherTool },
  model: openai("gpt-4o"),
  instructions: "You are a helpful assistant.",
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

# Mastra Integration

Mastra is a TypeScript-native agent framework. The CopilotKit integration runs entirely in Node.js -- no separate Python server needed. The agent runs within the Next.js process via Mastra's dev server.

## Prerequisites

- Node.js 18+
- OpenAI API key

## Key Dependencies

**Do not copy version labels from this example into iPix.** The upstream skill text has historically lagged the maintained example and may still mention beta packages.

For iPix, verify in this order before changing dependencies:

1. `/home/sk/ipixai/package.json` + lockfile
2. installed package source/types
3. current maintained example: https://github.com/CopilotKit/CopilotKit/tree/main/examples/integrations/mastra
4. live CopilotKit docs/MCP

Current audited iPix family (2026-09-04): `@copilotkit/runtime 1.68.1`, `@copilotkit/react-core 1.68.1`, `@ag-ui/mastra 1.1.2`, `@mastra/core 1.63.2`, `@mastra/memory 1.28.1`. Re-check at task execution time.

Current maintained CopilotKit Mastra example (verified 2026-09-04/05) uses `@copilotkit/runtime 1.70.0`, `@copilotkit/react-core 1.70.0`, `@ag-ui/mastra 1.1.2`. Its Mastra package versions are **example choices, not iPix upgrade authority**; some are older/alpha relative to iPix. Use the example for bridge shape and current CopilotKit family, then verify Mastra from iPix installed source/types and the Mastra skill/docs.

**Never add `--legacy-peer-deps` just because an old bundled example says to.** First prove a real peer conflict against the installed/current package family.

## Agent Definition (src/mastra/agents/index.ts)

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { weatherTool } from "@/mastra/tools";
import { LibSQLStore } from "@mastra/libsql";
import { z } from "zod";
import { Memory } from "@mastra/memory";

// Define shared state schema with Zod
export const AgentState = z.object({
  proverbs: z.array(z.string()).default([]),
});

export const weatherAgent = new Agent({
  id: "weather-agent",
  name: "Weather Agent",
  tools: { weatherTool },
  model: openai("gpt-4o"),
  instructions: "You are a helpful assistant.",
  memory: new Memory({
    storage: new LibSQLStore({
      id: "weather-agent-memory",
      url: "file::memory:",
    }),
    options: {
      workingMemory: {
        enabled: true,
        schema: AgentState,
      },
    },
  }),
});
```

Key patterns:

- Shared state is defined as a Zod schema and passed to Mastra's `Memory` via `workingMemory.schema`
- Tools are created with Mastra's `createTool()` helper
- The agent uses `@ai-sdk/openai` for the model provider

## Tools (src/mastra/tools/index.ts)

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const weatherTool = createTool({
  id: "get-weather",
  description: "Get current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City name"),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    feelsLike: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    windGust: z.number(),
    conditions: z.string(),
    location: z.string(),
  }),
  execute: async (inputData) => {
    // Call weather API...
    return await getWeather(inputData.location);
  },
});
```

## Mastra Instance (src/mastra/index.ts)

```typescript
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { weatherAgent } from "./agents";

export const mastra = new Mastra({
  agents: { weatherAgent },
  storage: new LibSQLStore({ id: "mastra-storage", url: ":memory:" }),
});
```

## Next.js Route (src/app/api/copilotkit/[[...slug]]/route.ts)

```typescript
import {
  CopilotRuntime,
  createCopilotHonoHandler,
  InMemoryAgentRunner,
} from "@copilotkit/runtime/v2";
import { MastraAgent } from "@ag-ui/mastra";
import { mastra } from "@/mastra";
import { handle } from "hono/vercel";

const runtime = new CopilotRuntime({
  agents: MastraAgent.getLocalAgents({ mastra }),
  runner: new InMemoryAgentRunner(),
});

const app = createCopilotHonoHandler({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
```

Key difference from other integrations: `MastraAgent.getLocalAgents({ mastra })` automatically discovers all agents registered in the Mastra instance. No need to manually specify URLs or create agent instances -- the agents run in-process.

## Running

Mastra uses its own dev server alongside Next.js:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "dev:agent": "mastra dev",
    "dev:ui": "next dev --turbopack"
  }
}
```

Run `pnpm dev` to start the Next.js app (Mastra agents load in-process). Use `pnpm dev:agent` for the standalone Mastra dev server with its own UI.

---
title: Mastra docs MCP lookup
description: Load before using Cursor user-mastra MCP tools; set projectPath to this repo root.
parent: mastra
impact: HIGH
impactDescription: When to use user-mastra MCP vs embedded vs links.md
tags: mastra, mcp, docs
---

# Mastra docs — MCP lookup matrix

Use **before** guessing APIs from training data. iPixai has **`user-mastra`** MCP (Cursor). Optional **`@mastra/mcp-docs-server`** is for agent-in-app MCP, not a substitute for installed types.

## Tool pick (Cursor `user-mastra`)

| Need | Tool | Required args | Notes |
| --- | --- | --- | --- |
| Full doc page by path | **`mastraDocs`** | `paths: ["docs/agents/overview"]` | Best for known URLs; returns markdown + related paths |
| Browse embedded guides | **`readMastraDocs`** | `package`, `projectPath`, optional `topic` | `@mastra/core`, `@mastra/memory`, … |
| Keyword search in installed docs | **`searchMastraDocs`** | `query`, **`projectPath`** | Often empty if embedded tree sparse — fall back to `mastraDocs` |
| List installed packages | **`listMastraPackages`** | `projectPath` | `@mastra/core`, `@mastra/memory`, `@mastra/pg`, … |
| Export / API surface | **`getMastraExports`** | `package`, `projectPath` | Type discovery |
| v1 migration | **`mastraMigration`** | (see schema) | Breaking changes |

Pass `projectPath` **only** to tools whose schema declares it (`searchMastraDocs`, `readMastraDocs`, `listMastraPackages`, `getMastraExports`, `getMastraHelp`). Value = `$(git rev-parse --show-toplevel)` (iPixai repo root — **not** `/home/sk/ipix/app` and **not** `mdeapp`). **`mastraDocs` does not take `projectPath`** — use `paths` and optional `queryKeywords` only.

## `mastraDocs` path patterns

| Area | Example paths |
| --- | --- |
| Docs | `docs/agents/overview`, `docs/memory/working-memory`, `docs/workflows/suspend-and-resume`, `docs/browser/overview` |
| Guides | `guides/build-your-ui/copilotkit`, `guides/guide/web-search`, `guides/migrations/upgrade-to-v1/overview` |
| Reference | `reference/agents/generate`, `reference/agents/agent`, `reference/streaming/agents/stream`, `reference/streaming/agents/MastraModelOutput` |
| Reference dirs | `reference/processors/`, `reference/harness/`, `reference/ai-sdk/`, `reference/memory/` |
| Tools API | `reference/tools/create-tool` |
| Core API | `reference/core/getAgentById` |
| Workflows suspend | `docs/workflows/suspend-and-resume` *(404 at `reference/workflows/suspend-and-resume`)* |
| Auth | `reference/auth/supabase` |
| Observability | `reference/observability/` · `reference/observability/tracing` |
| Evals | `reference/evals/` · `reference/evals/create-scorer` · `reference/evals/run-evals` |
| Memory | `reference/memory/memory-class` · [`references/memory.md`](../references/memory.md) |
| Workflows | `reference/workflows/workflow` · `reference/workflows/run-methods/resume` · [`references/workflows.md`](../references/workflows.md) |
| Streaming | `reference/streaming/agents/stream` · `reference/streaming/ChunkType` · [`references/streaming.md`](../references/streaming.md) |
| Browser | `reference/browser/agent-browser` · `reference/browser/browser-viewer` · [`references/browser.md`](../references/browser.md) |
| Examples v0 | *(not in MCP)* — HTTP/Firecrawl only | [`references/examples-v0.md`](../references/examples-v0.md) |

Optional: `queryKeywords: ["CopilotKit", "stream"]` for related-path hints.

## Remote fallbacks (MCP miss)

1. [`links.md`](../links.md) → append **`.md`** to doc URL
2. `curl -sL https://mastra.ai/llms.txt`
3. Firecrawl / browser on `https://mastra.ai/docs/...` or `https://mastra.ai/examples/v0/...` (examples **not** in `mastraDocs`)

## iPixai CopilotKit pattern (critical)

Official CopilotKit + Mastra guides often show a **standalone Mastra server** + `/chat` on `:4111`.

**iPixai Core** uses **in-process** `MastraAgent.getLocalAgents({ mastra, resourceId })` in Next.js `/api/copilotkit` — **not** `:4111/chat`. `resourceId` is `org:{orgId}::user:{userId}`.

CopilotKit v2 UI (`useComponent`, slots, headless) → **`copilotkit` skill**, not these Mastra refs.

If you deploy a **bundled** Mastra server with CopilotKit, externalize `@copilotkit/runtime` in bundler config (see official CopilotKit guide deployment section).

## Processors reference (guardrails / safety)

Built-in processor API lives under `reference/processors/` — e.g. `pii-detector`, `prompt-injection-detector`, `moderation-processor`, `token-limiter-processor`, `semantic-recall-processor`, `working-memory-processor`. Start from [`docs/agents/processors`](https://mastra.ai/docs/agents/processors).

## Observational memory vs iPixai working memory

Observational Memory (`@mastra/memory`) can compress long threads with Observer/Reflector agents. **iPixai Core** uses PostgresStore memory with org/user `resourceId` — do not swap in OM or Gemini-only concierge patterns without a convert-plan ticket.

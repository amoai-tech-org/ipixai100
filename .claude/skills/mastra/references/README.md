---
title: Mastra skill — reference index
description: Load to pick which references/*.md to open for a Mastra task. Every reference file has YAML frontmatter with its own load_when description.
parent: mastra
impact: HIGH
impactDescription: Progressive disclosure for 30+ reference modules
tags: mastra, index, references
---

# Mastra references index

Read **one** reference file per task (plus [`topic-routing.md`](topic-routing.md) when unsure).

| File | Load when |
| --- | --- |
| [`topic-routing.md`](topic-routing.md) | Any Mastra doc lookup — maps intent → `links.md` + local ref |
| [`embedded-docs.md`](embedded-docs.md) | Packages installed; need version-accurate API from `node_modules/@mastra` |
| [`core-concepts.md`](core-concepts.md) | Agent vs workflow vs tool vs memory vs storage |
| [`mastra-api.md`](mastra-api.md) | Local `npx --no-install mastra api` against `npm run dev:agent` (`:4111`); check `--help` first |
| [`model-selection.md`](model-selection.md) | Validate `provider/model` via `scripts/provider-registry.mjs` |
| [`mcp-docs-lookup.md`](mcp-docs-lookup.md) | Using Cursor `user-mastra` MCP (`mastraDocs`, `searchMastraDocs`) |
| [`remote-docs.md`](remote-docs.md) | No local packages; fetch from mastra.ai |
| [`create-mastra.md`](create-mastra.md) | New Mastra project / CLI setup |
| [`workflows.md`](workflows.md) | DAG workflows, suspend/resume, HITL (Roberto) |
| [`memory.md`](memory.md) | Memory, working memory, threads, recall |
| [`streaming.md`](streaming.md) | SSE, tool-call events, AG-UI bridge |
| [`browser.md`](browser.md) | AgentBrowser / Stagehand (Phase 2+) |
| [`tools.md`](tools.md) | `createTool`, tool schemas, agent tools |
| [`mcp.md`](mcp.md) | MCPClient / MCPServer overview (vendor paste — verify) |
| [`mcp-apps.md`](mcp-apps.md) | MCP Apps / Studio iframe UIs |
| [`agents-supervisor.md`](agents-supervisor.md) | Supervisor + subagents — **not iPixai Core**; conversion-plan Phase 2+. Do not apply mdeapp defer rules |
| [`agent-controller.md`](agent-controller.md) | Harness / `AgentController` for long-running, steerable interactive agent products — optional/advanced |
| [`advanced-runtime.md`](advanced-runtime.md) | Code Mode, Dynamic Workflows, Channels, Pub/Sub — optional capabilities with iPix fit guidance |
| [`evals-feedback.md`](evals-feedback.md) | Gates/verdicts, multi-turn evals, CI/Vitest integration, human feedback and regression verification |
| [`multi-agent.md`](multi-agent.md) | Multi-agent concepts and patterns |
| [`mdeai-concierge.md`](mdeai-concierge.md) | **Legacy** concierge notes — do not apply to iPixai |
| [`copilotkit.md`](copilotkit.md) | Mastra **separate-server** + CopilotKit (not iPixai default) |
| [`display-only.md`](display-only.md) | CopilotKit **v2** display-only → use `copilotkit` skill |
| [`headless-ui.md`](headless-ui.md) | CopilotKit **v2** headless → use `copilotkit` skill |
| [`slots.md`](slots.md) | CopilotKit **v2** slots → use `copilotkit` skill |
| [`examples-v0.md`](examples-v0.md) | Runnable v0 examples, Supatabs tables |
| [`common-errors.md`](common-errors.md) | Type errors / API mismatch debugging |
| [`migration-guide.md`](migration-guide.md) | Mastra v0 → v1 upgrades |
| [`model-providers.md`](model-providers.md) | Model router / provider strings |
| [`gemini.md`](gemini.md) | Google models in Mastra (optional — iPixai stays on starter pin until a provider ticket) |
| [`openai.md`](openai.md) | OpenAI models in Mastra |
| [`ai-sdk.md`](ai-sdk.md) | Vercel AI SDK + Mastra |
| [`react.md`](react.md) | React / Next starters |
| [`supabase-auth.md`](supabase-auth.md) | Supabase auth on Mastra server |
| [`workspace.md`](workspace.md) | Mastra workspace / BrowserViewer |
| [`agent-skills.md`](agent-skills.md) | First-class agent `skills`, `createSkill()`, filesystem/dynamic skill resolution |
| [`skill-search.md`](skill-search.md) | `SkillSearchProcessor` / on-demand skill loading |
| [`tool-search.md`](tool-search.md) | `ToolSearchProcessor` / on-demand tool loading |
| [`workspace-skills.md`](workspace-skills.md) | Workspace `SKILL.md` trees and shared filesystem discovery |
| [`trace-intelligence.md`](trace-intelligence.md) | Aggregate trace themes / agent-health investigation |
| [`rag-mastra.md`](rag-mastra.md) | RAG overview (Phase 2 defer) |
| [`rag-pgvector.md`](rag-pgvector.md) | PgVector embedding storage |

**iPixai rule:** Current registered agent is starter `weather-agent` (`default`). `production-planner` is the conversion-plan **target**, not an available ID. OpenAI starter pin (until a provider ticket) + CopilotKit in-process `getLocalAgents` + `resourceId` `org:…::user:…`. Ignore Gemini-only / CopilotKit 1.55.2 / `mdeapp` leftovers in older reference files.

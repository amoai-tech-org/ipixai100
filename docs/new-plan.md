# iPix AI Runtime v2 — plan index

**Audit date:** 2026-08-23  
**Status:** plan only — no implementation in this pass  
**Inputs:** live `main`, Linear, GitHub PRs, Supabase MCP (read-only), CopilotKit docs MCP, `01-plan.md` / `01-plana.md` / `02-copilotkit-repos.md`

| Doc | Contents |
| --- | -------- |
| [01-current-state-audit.md](01-current-state-audit.md) | Live iPix runtime audit |
| [02-copilotkit-example-adoption-plan.md](./02-copilotkit-example-adoption-plan.md) | Earlier example adoption notes |
| [03-core-mvp-advanced-roadmap.md](./03-core-mvp-advanced-roadmap.md) | Earlier Core/MVP/Advanced roadmap |
| [01-repo-review.md](./01-repo-review.md) | GitHub repo scores + top 10 |
| [02-repo-to-task-map.md](./02-repo-to-task-map.md) | Repo → PROPOSED IPI tasks |
| [03-new-ipix-build-plan.md](./03-new-ipix-build-plan.md) | Architecture + golden journey |
| [04-custom-code-reduction-plan.md](./04-custom-code-reduction-plan.md) | What official code replaces |
| [05-copilotkit-mastra-repos.md](05-copilotkit-mastra-repos.md) | URL shortlist |

**Strategy (unchanged from `01-plan.md`):** keep product and business logic; rebuild how CopilotKit, Mastra, and Postgres connect. Prove **one** Planner journey before migrating everything.

**Best starter:** CopilotKit `examples/integrations/mastra` + live [Mastra quickstart](https://docs.copilotkit.ai/integrations/mastra/quickstart) (`createCopilotRuntimeHandler` + `MastraAgent.getLocalAgents`).

**Core first task:** login → Planner → `TEST-123` streams → row in `mastra.*` → hard refresh → server restart → same message. Node only. No Cloudflare Worker in phase 1.

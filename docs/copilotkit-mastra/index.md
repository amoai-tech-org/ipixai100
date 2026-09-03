# CopilotKit × Mastra (iPixai)

Think of CopilotKit as the **studio intercom** (chat, buttons, cards). Mastra is the **production crew** (agents, tools, memory). This folder is the **home** for that pair in **`amoai-tech/ipixai`**.

**Status SSOT:** live Linear — [**IPI-1078 · IPI-EPIC · MASTRA COPILOTKIT — Secure Planner Runtime Sequence**](https://linear.app/amo100/issue/IPI-1078).  
**Mint SSOT:** [todo.md](./todo.md).  
**App SSOT:** current `src/` + lockfile.

Dashboard [**IPI-1076**](https://linear.app/amo100/issue/IPI-1076) and marketing [**IPI-1077**](https://linear.app/amo100/issue/IPI-1077) are **parallel** — they do not wait for **IPI-1041 · CORE-001**.

---

## Read these (canonical)

| Job | File |
| --- | --- |
| What we are building | **[prd.md](./prd.md)** (§5b brand · §5c CopilotKit · storage + mint) |
| Official URLs | **[links.md](./links.md)** |
| Now / Next / Later | **[roadmap.md](./roadmap.md)** |
| How we execute Core | **[plan.md](./plan.md)** (port + examples) |
| Check-off + mint | **[todo.md](./todo.md)** |
| Brand journey | **[brand.md](./brand.md)** — dumps: [../archive/copilotkit-mastra/brand/](../archive/copilotkit-mastra/brand/) |
| Master product PRD | [../prd.md](../prd.md) |

**Keep IPI-1078 focused** on secure Planner runtime. Brand intel, Postiz, Tool Search stay **after Core**.

---

## Archived (do not implement)

| Path | What |
| --- | --- |
| [../archive/copilotkit-mastra/copilotkit/](../archive/copilotkit-mastra/copilotkit/) | Numbered CopilotKit notes (108/109 folded into PRD §5c) |
| [../archive/copilotkit-mastra/tasks/](../archive/copilotkit-mastra/tasks/) | 05a audit, convert steps, db-001 matrix, example catalog, operating plan |
| [../archive/copilotkit-mastra/docs/](../archive/copilotkit-mastra/docs/) | Old mastra-plans, runtime-family, Operator-shell plan |
| [../archive/copilotkit-mastra/brand/](../archive/copilotkit-mastra/brand/) | Brand journey dumps (folded into brand.md) |
| [copilotkit/](./copilotkit/) | Stub only |
| [brand/](./brand/) | Stub only |

[tools.md](./tools.md) and [templates.md](./templates.md) stay as shortlists.

---

## Installed runtime (code, 2026-09-01)

| Piece | Pin |
| --- | --- |
| `@mastra/core` | `1.63.2` |
| `@mastra/pg` | `1.22.2` |
| CopilotKit | `1.68.1` |
| `@ag-ui/mastra` | `1.1.2` |

Host: **Vercel** (preview **IPI-1126** on project **ipixai**). **IPI-1121 · HOST-CF-001** is future — do not execute now.

Dev: `npm run dev:ui` and `npm run dev:agent` separately. Combined `npm run dev` is blocked. Never mutate production Supabase.

[Docs home](../index.md)

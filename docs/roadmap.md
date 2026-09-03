# iPix product roadmap

**Linear** is status, blockers, and assignees.  
**This file** is outcomes and order — not a 95-row status mirror.  
**[todo.md](todo-draft.md)** is only NOW / NEXT / GATES.  
Live project: [v2-ipix](https://linear.app/amo100/project/v2-ipix-cd2f90b58cd2/issues).

Think of iPix as a **fashion studio floor**, not a chatbot on a website. CopilotKit is the intercom and the buttons. Mastra is the crew in the back. Supabase is the filing cabinet that is always right.

```text
iPix screens (already designed)
        ↓
CopilotKit / AG-UI  — context, buttons, cards, working drafts
        ↓
Mastra              — agents, workflows, tools, approvals
        ↓
Supabase truth · Cloudinary media · Postiz publish · Stripe money
```

Do **not** build by vendor. Do **not** create another Mastra upgrade ticket after Core. Connect existing screens; do not invent a new shell.

---

## Four layers (keep)

| Layer | Outcome |
| -- | -- |
| **1 · Foundation** | Certified Mastra family + stream + hosted Postgres + Org A/B ACCESS + Planner + CORE exam |
| **2 · Core MVP** | CopilotKit context / GenUI / HITL (audit first) → Brand Brain → typed ShootPlan → HITL → save once → booking → Cloudinary library |
| **3 · Post-MVP** | Research → opportunity → campaign → reuse assets → content → Postiz → analytics → learn |
| **4 · Advanced** | Evals, Task Lists when Planner is multi-step, Skill/Tool Search after a large registry, schedules, browser, dynamic workflows, OpenClaw |

Cloudinary stays **parallel**. Host is **Vercel** (`ipixai` preview for ACCESS). Cloudflare Workers are a **future** host option only — not this roadmap.

---

## Foundation — NOW (this is the critical order)

Mastra 1.63.2 is **in progress**, not a post-Core idea. Owner: **IPI-1042 · RUNTIME-001 — Make the New iPix AI Runtime Compile and Build Cleanly** ([PR #25](https://github.com/amoai-tech/ipixai/pull/25)). GitHub `main` is still `@mastra/core@1.41.0`.

**Do not create `MASTRA-UPGRADE-001`.** That duplicates 1042 + **IPI-1009 · MASTRA-UPG-004** (Linear title still says Cloudflare; **execute as stream/HITL/Stop on this Vercel/Node family**). Program: **IPI-1005 · MASTRA-UPG-000**.

```text
IPI-1042 · RUNTIME-001     Mastra 1.63.2 family (now)
        ↓
IPI-1009 · MASTRA-UPG-004  CopilotKit / stop / tenant check on that family
        ↓
IPI-1045 · STREAM-001      (already In Progress — keep shipping)
        ↓
IPI-1124 · MASTRA-HOST-PG-001   after 1042 (use certified @mastra/pg, not 1.12.1)
      ∥
IPI-1125 · QA-ORG-001
        ↓
IPI-1126 · HOST-PREVIEW-001
        ↓
IPI-1047 · ACCESS-001      hosted Org A/B 403
        ↓
IPI-1048 · PLANNER-001 → 1049 tools / 1050 memory / 1088 replay / 1051 UI
        ↓
IPI-1041 · CORE-001 exam   must run on the certified 1.63.2 family (blocked by 1009)
```

Core still means: operator A’s shot list survives refresh and restart; operator B with the same URL is denied.

**Do not create `MASTRA-CORE-001`.** Reuse **IPI-994 · MASTRA-WF-001**, **IPI-995 · MASTRA-WF-002**, **IPI-998 · MASTRA-WF-005** (AI Platform). Do not clone **IPI-993 · MASTRA-WF-000** onto v2-ipix.

**IPI-1124** must wait on 1042 so hosted pooling is proven on `@mastra/pg@1.22.2`, not re-tested on 1.12.1. Smallest change to `pg-store.ts`: allow approved hosted hostnames, transaction pooler first, pool max 1–2, SSL, fail closed. No second Supabase project.

**IPI-1088 · COPILOT-REPLAY-001:** `SqliteAgentRunner` is local/single-process only. Hosted Vercel needs CopilotKit Intelligence **or** a runner on the **same** Mastra/Supabase Postgres — not a second SQLite store.

---

## Core MVP — after the exam

CopilotKit CONTEXT / CONTROL / UI / STATE are **capabilities**, not four automatic tickets.

| Capability | Prefer existing owner |
| -- | -- |
| Context | **IPI-1087 · PLANNER-CONTEXT-001** |
| Approval / GenUI cards | **IPI-1084 · APPROVAL-001** |
| Replay / working restore | **IPI-1088 · COPILOT-REPLAY-001** |
| Planner screen | **IPI-1051 · UI-001** |
| App shell | **IPI-1065 · APP-001** |

After Core: gap-audit those four contracts. Create a ticket only if a contract has no owner. Likely gap: non-chat buttons that start Mastra (**COPILOT-CONTROL-001**) — still search Linear first.

Browser IDs are hints. Session + RLS authorize. Shared agent state is a **draft**. Supabase is **truth**. Frontend tools may navigate and request; they must not charge, publish, self-approve, or bypass RLS.

Agents: ProductionPlanner, Brand, Research, Campaign, Asset is a **current target**, not a permanent cap. Add an agent only when instructions, tools, memory, or evals are materially different. Shot list / budget stay **tools**.

Mastra built-ins (task lists, ask-user, submit-plan, fetch) are **evaluate-before-custom**. They do not replace **IPI-1084**. Task Lists: optional post-Core once Planner is multi-step — not Advanced-only, not on the Core critical path.

Then: Brand Brain (reuse existing tables) → **IPI-1081** ShootPlan → **IPI-1084** HITL → **IPI-1083** save once → booking (deterministic) → Cloudinary approved library.

---

## Media — parallel

Layer spec: [cloudinary/prd.md](./cloudinary/prd.md) · [cloudinary/roadmap.md](./cloudinary/roadmap.md) · [cloudinary/todo.md](./cloudinary/todo.md).

```text
IPI-1040 → IPI-1108 → IPI-1109 → IPI-1122 (canonical shoot.shoots, not public.shoots)
        → IPI-1110 ∥ 1111 ∥ 1112 → IPI-1113 ∥ 1114
        → IPI-1116 Widget ∥ IPI-1069 library → 1118 / 1119 / 1120 → IPI-1115 last
```

Native ladder: Cloudinary Dashboard → skill/MCP → CLI → Widget → next-cloudinary → SDK signer. No custom uploader. **1108 is not parallel with 1109.**

---

## Post-MVP / Advanced

Research → opportunity → campaign strategy/plan → reuse assets → content → approve → Postiz → analytics → learn.  
Children under empty **IPI-1105 · CAMPAIGNS & PUBLISHING** after duplicate search.

Advanced: evals → Task/Skill/Tool Search when the registry is large enough → schedules → browser → dynamic workflows → OpenClaw/Hermes (ops only, not brand/booking/payment truth). Tool Search needs `@mastra/core >= 1.58.0` **and** a real tool catalog — not one weather tool.

Official CopilotKit examples: 52 demos in the current monorepo. Use them to answer a specific question, not as the roadmap. Start: `examples/integrations/mastra` + installed types + current Mastra docs.

---

## Who owns what

| System | Owns |
| -- | -- |
| Supabase | Orgs, brands, shoots, campaigns, approvals |
| pgvector | Retrieval only |
| Mastra | Reasoning |
| CopilotKit | AI ↔ screen |
| Cloudinary | Binaries and transforms |
| Stripe | Money |
| Postiz | Social publish |
| OpenClaw / Hermes | Later comms — not core truth |

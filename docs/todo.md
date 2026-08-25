---
title: "Execution backlog"
description: "v2-ipix check-off order. Live Linear is status SSOT; this file is the repo map."
---

# New iPix plan — ordered TODO

**Repo check-off SSOT:** this file (`docs/todo.md`).  
**Status SSOT:** live Linear project [v2-ipix](https://linear.app/amo100/project/v2-ipix-cd2f90b58cd2). If this table and Linear disagree, Linear wins.  
**Product SSOT:** [Product requirements](./prd.md) · [Product sitemap](./sitemap.md)  
**How to use:** work **top to bottom** in Core. One concern per PR.  
**Repository:** [amoai-tech/ipixai](https://github.com/amoai-tech/ipixai)  
**Roadmap detail:** [12-task-roadmap.md](./12-task-roadmap.md)  
**Area detail:** [Mastra conversion](./mastra/10-mastra-convert.md) · [DB-001 matrix](./mastra/db-001-matrix.md) · [Data pack](./data/README.md)

Status legend: 🟢 Done · 🟡 In Progress · 🔵 Todo · ⚪ Backlog · ⬛ Epic · ∥ parallel · **GATE** stop line

---

## Wave 0 — closed / managed separately

> **Wave 0 SQL hardening** is closed on legacy `lumina-studio` (PRs #982, #983, #984, #986, #987). Do **not** write production Supabase during Core Mastra work. Persistence proofs use local then existing hosted + `TEST-<uuid>` only — never a second hosted preview project.

---

## Current Core position (2026-08-25)

- **IPI-1042 · RUNTIME-001 — Make the New iPix AI Runtime Compile and Build Cleanly** is **Done** (Linear + `origin/main`).
- **Next:** **IPI-1043 · DB-001 — Prove Mastra Can Use the iPix Postgres Schema Safely** (In Progress, read-only matrix). **IPI-1037 · AUTH-001** can start in parallel after 1042.
- Do **not** start dashboard / wizard / marketing until **IPI-1041 · CORE-001** is Done.

**Environment:** local Supabase first; hosted `nvdlhrodvevgwdsneplk` + `TEST-<uuid>` only; fail closed on production writes.

**Reuse:** proven React + business logic. Official CopilotKit handler + AG-UI events. Do not copy Worker/Hyperdrive.

## Better Core order (not one long chain)

```text
IPI-1042 RUNTIME-001
   ├─ IPI-1043 DB-001 → IPI-1044 PG-001
   └─ IPI-1037 AUTH-001 → IPI-1046 AUTH-002

PG-001 + AUTH-002 → IPI-1045 STREAM-001 → IPI-1047 ACCESS-001
STREAM-001 → IPI-1048 PLANNER-001 → IPI-1049 TOOL-001
PG-001 + PLANNER-001 → IPI-1050 MEM-001
AUTH + STREAM + PLANNER → IPI-1051 UI-001 → IPI-1031 CORE-HOST-REF → IPI-1041 CORE-001
```

Wave 0 parallel (do not steal Core): `IPI-897 ∥ IPI-863 ∥ IPI-1039 ∥ IPI-1040`

---

## After Core — thin MVP first, dashboard fan-out

```text
CORE-001 → DESIGN-001 → APP-001
   ├─ BRAND-001 ∥ SHOOT-001          ← thin MVP path
   ├─ ASSETS-001 ∥ CRM-001 ∥ TALENT-BOOKING-001 ∥ OPERATIONS-001
   └─ HOME-001 (better after BRAND) · ANALYTICS-001 (better after OPS)

CORE-001 → **PLANNER-TRACE-001 (minimal)** → then:
BRAND + SHOOT → PLAN-001 → APPROVAL-001 → SHOOT-SAVE-001 → SHOOT-WIZARD-001
             → PLANNER-CONTEXT-001 → PLANNER-QUALITY-001

Other `/app` pages (HOME, ASSETS, CRM, TALENT, OPS) ∥ after APP-001 — not on the thin launch spine.

**Guardrails (add to existing ACs, no new issues):** AUTH token never in model content · client `orgId` not authoritative · ACCESS deny leaks zero messages · TOOL-001 no service-role / no writes · SHOOT-SAVE same idempotency key → same shoot id · APPROVAL reject = zero writes · PLANNER-QUALITY approval-before-write in CI · MARKETING-SEO preview hosts never canonical.
```

HITL + save is the sensitive path: official Mastra suspend/resume + one idempotent write. Grants **and** RLS.

---

## Legend

🟢 Done · 🟡 In Progress · 🔵 Todo (ready) · ⚪ Backlog · ⬛ Epic/tracker · ∥ parallel · **GATE** stop line

**49 Linear rows below** (6 marketing duplicates listed after). Statuses below are a snapshot (2026-08-25). **Live Linear wins** if they disagree.

---

## All 49

| # | Wave | Do | Linear | Spec | What to do | After | Status |
|---|---|---|---|---|---|---|---|
| 1 | 0 | ⬛ | [IPI-1075](https://linear.app/amo100/issue/IPI-1075) | **SUPABASE-EPIC** | Parent for accounts, data, AI memory. | — | 🟡 In Progress |
| 2 | 0 | ⬛ | [IPI-1036](https://linear.app/amo100/issue/IPI-1036) | **WAVE-0-EPIC** | Hardening parent. Close when 863 + 897 + 1039 + 1031 are green. | — | 🟡 In Progress |
| 3 | 0 | ⬛ | [IPI-1038](https://linear.app/amo100/issue/IPI-1038) | **MASTRA-V2-002** | Tracker: durability. Owners PG-001 / MEM-001 / CORE-001. | — | ⚪ Backlog |
| 4 | 0 | ⬛ | [IPI-1052](https://linear.app/amo100/issue/IPI-1052) | **CONVERT-001** | Stay aligned with convert doc. Not a code owner. | — | ⚪ Backlog |
| 5 | 1 | 🟢 | [IPI-1042](https://linear.app/amo100/issue/IPI-1042) | **RUNTIME-001** | Pin one CopilotKit+Mastra family, add `@mastra/pg`, typecheck, test, build. No store wiring. | Starter in repo | 🟢 Done (Linear + `origin/main`) |
| 6 | 0 | ∥ | [IPI-897](https://linear.app/amo100/issue/IPI-897) | **SB-SEC-009** | Stop `planner` auto-grants. Prove locally / existing hosted; no unsupported admin ALTERs. | Beside Core | 🔵 Todo |
| 7 | 0 | ∥ | [IPI-863](https://linear.app/amo100/issue/IPI-863) | **AUTH-V2-001** | Block leaked passwords (HIBP). Pro+. | Beside Core | 🔵 Todo |
| 8 | 0 | ∥ | [IPI-1039](https://linear.app/amo100/issue/IPI-1039) | **SB-V2-003** | Owner for every Advisor warning. Do not mass-revoke KEEP. | Beside Core | ⚪ Backlog |
| 9 | 0 | ∥ | [IPI-1040](https://linear.app/amo100/issue/IPI-1040) | **MIGRATION-001** | Add a V2 migration locally without replaying the dump. | After 1042 | ⚪ Backlog |
| 10 | 1 | ⬛ | [IPI-1078](https://linear.app/amo100/issue/IPI-1078) | **MASTRA-EPIC** | Core AI parent. Close with CORE-001. | 1042 started | 🔵 Todo |
| 11 | 1 | **NEXT** | [IPI-1043](https://linear.app/amo100/issue/IPI-1043) | **DB-001** | MATCH/CHANGE/MISSING vs **installed** PostgresStore types + local/hosted `mastra`. Read-only. | 1042 | 🟡 In Progress |
| 12 | 1 | → | [IPI-1044](https://linear.app/amo100/issue/IPI-1044) | **PG-001** | Conversations survive restart. Local then `TEST-<uuid>` on existing hosted. `disableInit` if tables exist. | 1043 | ⚪ Backlog |
| 13 | 1 | ∥ | [IPI-1037](https://linear.app/amo100/issue/IPI-1037) | **AUTH-001** | Real SSR cookie session. Unauth CopilotKit = 401. No `demo-user`. | 1042 | ⚪ Backlog |
| 14 | 1 | → | [IPI-1046](https://linear.app/amo100/issue/IPI-1046) | **AUTH-002** | Server-derived org `resourceId`. Client cannot spoof. | 1037 | ⚪ Backlog |
| 15 | 1 | → | [IPI-1045](https://linear.app/amo100/issue/IPI-1045) | **STREAM-001** | Thin authenticated `/api/copilotkit`. Official AG-UI events. | 1044 + 1046 | ⚪ Backlog |
| 16 | 1 | → | [IPI-1047](https://linear.app/amo100/issue/IPI-1047) | **ACCESS-001** | Org B cannot open Org A thread. Server-side ownership. | 1045 | ⚪ Backlog |
| 17 | 1 | → | [IPI-1048](https://linear.app/amo100/issue/IPI-1048) | **PLANNER-001** | Production Planner default agent. Remove weather as product. | 1045 | ⚪ Backlog |
| 18 | 1 | → | [IPI-1049](https://linear.app/amo100/issue/IPI-1049) | **TOOL-001** | Compute-only shoot tools. Save is 1083. Reuse pure logic. | 1048 | ⚪ Backlog |
| 19 | 1 | → | [IPI-1050](https://linear.app/amo100/issue/IPI-1050) | **MEM-001** | Memory after refresh/restart. Same store as PG-001. | 1044 + 1048 | ⚪ Backlog |
| 20 | 1 | → | [IPI-1051](https://linear.app/amo100/issue/IPI-1051) | **UI-001** | One authenticated Planner screen. Not the operator shell. | 1045 + 1048 + 1037 | ⚪ Backlog |
| 21 | 1 | → | [IPI-1031](https://linear.app/amo100/issue/IPI-1031) | **CORE-HOST-REF** | Hosted `TEST-<uuid>` proof on **existing** project. | 1051 | ⚪ Backlog |
| 22 | 1 | **GATE** | [IPI-1041](https://linear.app/amo100/issue/IPI-1041) | **CORE-001** | Refresh, restart, Org A/Org B 403. Stop line. | 1047 + 1049 + 1050 + 1051 + 1031 | ⚪ Backlog |
| 23 | 2 | ⬛ | [IPI-1076](https://linear.app/amo100/issue/IPI-1076) | **DASHBOARD-EPIC** | Operator workspace parent. | CORE-001 | ⚪ Backlog |
| 24 | 2 | ⬛ | [IPI-1079](https://linear.app/amo100/issue/IPI-1079) | **MVP-EPIC** | Shoot launch parent. | CORE-001 | ⚪ Backlog |
| 25 | 2 | → | [IPI-1080](https://linear.app/amo100/issue/IPI-1080) | **DESIGN-001** | Reuse proven visual system. | CORE-001 | ⚪ Backlog |
| 26 | 2 | → | [IPI-1065](https://linear.app/amo100/issue/IPI-1065) | **APP-001** | One `/app/*` shell + nav. | 1080 | ⚪ Backlog |
| 27 | 2 | ∥ MVP | [IPI-1068](https://linear.app/amo100/issue/IPI-1068) | **BRAND-001** | Brand list + profile. RLS + grants. | 1065 | ⚪ Backlog |
| 28 | 2 | ∥ MVP | [IPI-1067](https://linear.app/amo100/issue/IPI-1067) | **SHOOT-001** | Shoot list + record. `shoot.shoots` only. | 1065 | ⚪ Backlog |
| 29 | 2 | ∥ | [IPI-1066](https://linear.app/amo100/issue/IPI-1066) | **HOME-001** | Command Center, real KPIs. | 1065 (better after 1068) | ⚪ Backlog |
| 30 | 2 | → MVP | [IPI-1081](https://linear.app/amo100/issue/IPI-1081) | **PLAN-001** | Structured shoot plan from Planner. | 1068 + 1067 | ⚪ Backlog |
| 31 | 2 | → MVP | [IPI-1084](https://linear.app/amo100/issue/IPI-1084) | **APPROVAL-001** | HITL: official suspend/resume. | 1081 | ⚪ Backlog |
| 32 | 2 | → MVP | [IPI-1083](https://linear.app/amo100/issue/IPI-1083) | **SHOOT-SAVE-001** | One idempotent `commit_shoot_draft` + RLS + grants. | 1084 | ⚪ Backlog |
| 33 | 2 | → MVP | [IPI-1085](https://linear.app/amo100/issue/IPI-1085) | **SHOOT-WIZARD-001** | Deliverables → shots → budget. | 1083 | ⚪ Backlog |
| 34 | 2 | → MVP | [IPI-1087](https://linear.app/amo100/issue/IPI-1087) | **PLANNER-CONTEXT-001** | Active brand/shoot brief in session. | 1085 | ⚪ Backlog |
| 35 | 2 | → MVP | [IPI-1086](https://linear.app/amo100/issue/IPI-1086) | **PLANNER-QUALITY-001** | Catch planner mistakes before operators. | 1087 | ⚪ Backlog |
| 36 | 2 | ∥ | [IPI-1082](https://linear.app/amo100/issue/IPI-1082) | **PLANNER-TRACE-001** | Where requests succeeded/slowed/failed. | CORE-001 | ⚪ Backlog |
| 37 | 2 | ∥ | [IPI-1069](https://linear.app/amo100/issue/IPI-1069) | **ASSETS-001** | Gallery + channel preview. | 1065 | ⚪ Backlog |
| 38 | 2 | ∥ | [IPI-1070](https://linear.app/amo100/issue/IPI-1070) | **CRM-001** | Companies, contacts, pipeline. | 1065 | ⚪ Backlog |
| 39 | 2 | ∥ | [IPI-1071](https://linear.app/amo100/issue/IPI-1071) | **TALENT-BOOKING-001** | Talent + bookings. | 1065 | ⚪ Backlog |
| 40 | 2 | ∥ | [IPI-1072](https://linear.app/amo100/issue/IPI-1072) | **OPERATIONS-001** | Inbox + campaigns. | 1065 | ⚪ Backlog |
| 41 | 2 | ∥ | [IPI-1073](https://linear.app/amo100/issue/IPI-1073) | **ANALYTICS-001** | Honest/null KPIs. | 1072 (better) | ⚪ Backlog |
| 42 | 3 | ⬛ | [IPI-1077](https://linear.app/amo100/issue/IPI-1077) | **MARKETING-EPIC** | Public site parent. | CORE-001 | ⚪ Backlog |
| 43 | 3 | → | [IPI-1053](https://linear.app/amo100/issue/IPI-1053) | **MARKETING-NAV-001** | Marketing chrome. Not `/app/*`. | CORE-001 | ⚪ Backlog |
| 44 | 3 | ∥ | [IPI-1057](https://linear.app/amo100/issue/IPI-1057) | **MARKETING-HOME-001** | Homepage. No marketing CopilotKit chat. | 1053 | ⚪ Backlog |
| 45 | 3 | ∥ | [IPI-1060](https://linear.app/amo100/issue/IPI-1060) | **MARKETING-SERVICES-001** | Service pages + 301s. | 1053 | ⚪ Backlog |
| 46 | 3 | ∥ | [IPI-1058](https://linear.app/amo100/issue/IPI-1058) | **MARKETING-LOGIN-001** | Login UX on new Auth. | 1053 + 1037 | ⚪ Backlog |
| 47 | 3 | → | [IPI-1063](https://linear.app/amo100/issue/IPI-1063) | **MARKETING-SEO-001** | Public sitemap only. | 1057 + 1060 | ⚪ Backlog |
| 48 | 3 | ∥ | [IPI-1064](https://linear.app/amo100/issue/IPI-1064) | **MARKETING-MEDIA-001** | Images/sliders. | 1057 + 1060 | ⚪ Backlog |
| 49 | 3 | → | [IPI-1074](https://linear.app/amo100/issue/IPI-1074) | **PLANS-001** | Legacy `/app/plans`. Not Core Planner. | 1065 | ⚪ Backlog |

---

## One person, fastest safe calendar

```text
1042                         🟢 Done
1043 ∥ 1037                  ← next (1043 In Progress)
1044 after 1043 · 1046 after 1037
1045 after 1044+1046
1047 ∥ 1048 after 1045
1049 after 1048 · 1050 after 1044+1048
1051 after auth+stream+planner
1031 → 1041                  GATE
1080 → 1065
1068 ∥ 1067                  thin MVP
1081 → 1084 → 1083 → 1085 → 1087 → 1086
1069 ∥ 1070 ∥ 1071 ∥ 1072 · 1066 · 1073
1053 → 1057 ∥ 1060 ∥ 1058 → 1063 ∥ 1064 · 1074
```

---

## Skip — duplicates (not in the 49)

| Duplicate | Use |
|---|---|
| IPI-1054 NAV | IPI-1053 |
| IPI-1055 HOME | IPI-1057 |
| IPI-1056 LOGIN | IPI-1058 |
| IPI-1059 SERVICES | IPI-1060 |
| IPI-1061 SEO | IPI-1063 |
| IPI-1062 MEDIA | IPI-1064 |

IPI-1032 SB-CI-IPV4 is **Done** on SUPABASE (PR #987). Not v2-ipix.

Do **not** build placeholder `IPI-V2-020` IDs. Use the Linear rows in this file.

---

## STOP LINE

No Operator Shell, MVP pages, Post-MVP, or Advanced work until **IPI-1041 · CORE-001** passes (refresh, restart, Org B 403, with evidence).

### Out of scope until after Core gold

- Cloudflare Worker as the AI runtime
- MCP external integrations as Core
- Multi-user live cursors
- GraphRAG / observational memory
- WhatsApp / external messaging

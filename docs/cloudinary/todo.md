---
title: Cloudinary media — tracker
checked: 2026-09-01
ssot_status: live Linear IPI-1102
ssot_mint: docs/cloudinary/todo.md
---

# Cloudinary — tracker

**How to use:** Work **pipe** then **widget** then **cutover**. Later rows are the full media list — **not** “create these in Linear today.”  
**Status SSOT:** live Linear — [**IPI-1102 · PRODUCTION & MEDIA**](https://linear.app/amo100/issue/IPI-1102)  
**Mint SSOT:** this file (**0** new Foundation IPIs on 2026-09-01).  
**Specs:** [prd.md](./prd.md) · [roadmap.md](./roadmap.md) · [official-repos.md](./official-repos.md) · **URLs:** [../links.md](../links.md)

If this file disagrees with Linear, **Linear wins**. If it disagrees with **Do not add** / **Add later**, **this file wins** on mint.

**Linear action:**

| Action | Meaning |
| --- | --- |
| **Exists — execute** | Ticket is live. Do the work. |
| **Exists — update** | Ticket is live. Strengthen ACs / `relatedTo` — **not** a new IPI. |
| **Add later** | Not in Linear as this spec. After **IPI-1120** + duplicate search, mint only if still needed. |
| **Do not add** | Invented name. Use the mapped live ticket. |

**Legend:** 🟢 Done · 🟡 In Progress · 🔵 Todo · ⚪ Backlog · **n/a** not an IPI yet

Host: **Vercel**. Split `dev:ui` / `dev:agent`. No production Cloudinary trigger change until **IPI-1115**. No production Supabase writes unless the named ticket says so.

Checked Linear **2026-09-01:** **IPI-1040** 🟡 · **IPI-1108** 🔵 · **IPI-1109** 🔵 · **IPI-1065** 🟡 · **IPI-1097** / **1116** ⚪. Lockfile still has **no** `cloudinary` packages.

---

## Next (do this)

1. **[IPI-1040 · MIGRATION-001 — Prove New iPix Database Changes Can Be Added Without Replaying Old Migrations](https://linear.app/amo100/issue/IPI-1040)** — 🟡 **Exists — execute**. Forward-only history; **not** Brand product logic.  
2. **[IPI-1108 · CLD-FOUNDATION-001 — Validate Cloudinary Tooling, SDKs, Environment, and Existing Configuration](https://linear.app/amo100/issue/IPI-1108)** — 🔵 **Exists — execute**. Power Start → CLI → MCP → install if missing. **Not parallel with 1109.**  
3. **[IPI-1109 · MEDIA-DATA-001 — Prove Asset Tables Stay Org-Safe for V2](https://linear.app/amo100/issue/IPI-1109)** — 🔵 **Exists — execute**. Read-only first; DDL in **IPI-1122** after 1040.

---

## Pipe (Core APIs)

```text
1040 → 1108 → 1109 → 1122 (if DDL)
        → 1110 ∥ 1111 ∥ 1112
        → 1113 ∥ 1114
```

| Status | Task | Linear action | Phase |
| :---: | --- | --- | --- |
| 🟡 | **[IPI-1040 · MIGRATION-001 — Prove New iPix Database Changes Can Be Added Without Replaying Old Migrations](https://linear.app/amo100/issue/IPI-1040)** | Exists — execute | Pipe |
| 🔵 | **[IPI-1108 · CLD-FOUNDATION-001 — Validate Cloudinary Tooling, SDKs, Environment, and Existing Configuration](https://linear.app/amo100/issue/IPI-1108)** | Exists — execute | Pipe |
| 🔵 | **[IPI-1109 · MEDIA-DATA-001 — Prove Asset Tables Stay Org-Safe for V2](https://linear.app/amo100/issue/IPI-1109)** | Exists — execute (audit; no duplicate DDL) | Pipe |
| 🔵 | **[IPI-1122 · SB-MEDIA-HARDEN-001 — Harden Supabase Media Grants and Canonical Shoot Links for Cloudinary V2](https://linear.app/amo100/issue/IPI-1122)** | Exists — execute after 1040 when 1109 needs DDL | Pipe |
| ⚪ | **[IPI-1110 · CLD-SIGN-001 — Sign Cloudinary Uploads for the Trusted Organization](https://linear.app/amo100/issue/IPI-1110)** | Exists — execute | Pipe |
| ⚪ | **[IPI-1111 · CLD-WEBHOOK-001 — Mirror Cloudinary Uploads and Deletes into Supabase](https://linear.app/amo100/issue/IPI-1111)** | Exists — execute · do not retarget prod | Pipe |
| ⚪ | **[IPI-1112 · CLD-DELIVERY-001 — Serve Org-Safe Cloudinary Previews with Named Transforms](https://linear.app/amo100/issue/IPI-1112)** | Exists — execute | Pipe |
| ⚪ | **[IPI-1113 · CLD-E2E-001 — Prove One Disposable Upload Reaches Supabase Ready](https://linear.app/amo100/issue/IPI-1113)** | Exists — execute | Pipe |
| ⚪ | **[IPI-1114 · CLD-RECONCILE-001 — Detect Cloudinary and Supabase Drift Without Mutating Production](https://linear.app/amo100/issue/IPI-1114)** | Exists — execute | Pipe |

---

## Widget + library (needs APP-001)

```text
1065 shell ∥ pipe
1116 ∥ 1069
        ↓
1067 → 1118 → 1119 → 1120
        ↓
1115 last
```

| Status | Task | Linear action | Phase |
| :---: | --- | --- | --- |
| 🟡 | **[IPI-1065 · APP-001 — Give Operators One Consistent iPix Workspace Across the App](https://linear.app/amo100/issue/IPI-1065)** | Exists — execute (shell; parallel with pipe) | Widget |
| ⚪ | **[IPI-1067 · SHOOT-001 — Let Operators Browse Shoots and Open Complete Shoot Records](https://linear.app/amo100/issue/IPI-1067)** | Exists — execute before attach-to-shoot | Widget |
| ⚪ | **[IPI-1069 · ASSETS-001 — Let Operators Browse Assets and Manage Asset Records](https://linear.app/amo100/issue/IPI-1069)** | Exists — update (thumbs via 1112; no upload in this PR) | Widget |
| ⚪ | **[IPI-1116 · CLD-UPLOAD-001 — Let Operators Upload Shoot Selects with the Cloudinary Widget](https://linear.app/amo100/issue/IPI-1116)** | Exists — execute · child of 1097 | Widget |
| ⚪ | **[IPI-1118 · SHOOT-ASSETS-001 — Attach Uploaded Assets to the Correct Saved Shoot](https://linear.app/amo100/issue/IPI-1118)** | Exists — execute · child of 1097 | Widget |
| ⚪ | **[IPI-1119 · MEDIA-APPROVAL-001 — Approve or Reject the Exact Cloudinary Asset Version](https://linear.app/amo100/issue/IPI-1119)** | Exists — execute · child of 1097 | Widget |
| ⚪ | **[IPI-1120 · MEDIA-DELIVERY-001 — Deliver Only Approved Named-Transform Asset Versions](https://linear.app/amo100/issue/IPI-1120)** | Exists — execute · child of 1097 | Widget |
| ⚪ | **[IPI-1097 · MEDIA-001 — Upload, Review, Approve, and Deliver Shoot Assets](https://linear.app/amo100/issue/IPI-1097)** | Exists — execute as **gate**, not one PR | Widget |
| ⚪ | **[IPI-1102 · PRODUCTION & MEDIA](https://linear.app/amo100/issue/IPI-1102)** | Exists — epic | Widget |
| ⚪ | **[IPI-1115 · CLD-CUTOVER-001 — Cut Cloudinary Notifications Over to V2 Safely](https://linear.app/amo100/issue/IPI-1115)** | Exists — execute **last** | Cutover |

---

## Add later (do not mint now)

| Spec | After | Notes |
| --- | --- | --- |
| **CLD-SEARCH-001** | 1069 | Filter in **Supabase** |
| **CLD-META-001** | Library | Structured metadata; org/approval stay in Postgres |
| **MEDIA-AGENT-001** | Brand Core + 1120 | One `findAssets` tool |
| **MEDIA-LAUNCH-AGENT-001** | Agent | Official launch-agent **patterns**; HITL |
| **CLD-BULK-001** | 1119 | N audit events for N ids |
| **CLD-MLW-001** | MVP | Media Library Widget pick → existing row |
| **CLD-VIDEO-001** | 1069 + 1112 | `CldVideoPlayer` |
| **CLD-TRASH-001** | 1111 delete path | Archive ≠ Cloudinary trash as SoT |
| **CLD-RECONCILE-UI-001** | 1114 | Read-only report |
| **CLD-EXPORT-001** | 1120 | Named transforms + manifest |
| **CLD-CHUNK-001** | 1116 | Widget large upload only if needed |
| **CLD-OPS-001** | 1108 | Usage pointer; no fake metrics |
| **CLD-AI-MOD-001** / **CLD-AI-TAG-001** | MVP | Native Cloudinary; store in metadata |
| **CLD-MEDIAFLOWS-001** / **CLD-SMARTCOL-001** | Named workflow | Native |
| **CLD-PUBLISH-001** | Campaigns epic | Manifests, not Postiz clone |
| **CLD-BACKUP-001** | Exit plan | R2/originals |
| **CLD-ANALYTICS-001** | Delivery | Official analytics only |

---

## Do not add

| Invented / old | Use instead |
| --- | --- |
| Duplicate **IPI-433 / 641 / 639** on v2-ipix | **1116 / 1111 / 1119** |
| Custom uploader / Worker signer | **1116** + **1110** |
| Cloudinary Search as library DB | **CLD-SEARCH-001** later + **1069** |
| **IPI-1084 · APPROVAL-001** as asset approval | Planner HITL — assets are **1119** |
| **IPI-1064 · MARKETING-MEDIA-001** as DAM | Public site |
| One-PR **MEDIA-001** | Children **1116 / 1118 / 1119 / 1120** |
| `create-cloudinary-next` over this repo | **1108** in existing Next app |

---

## Hard gates (ACs, not extra tickets)

- Official `cloudinary` + `next-cloudinary`; no API secret in the client.
- Signed widget; fresh sign on brand/shoot change; stale sign rejected.
- Webhook: raw body HMAC → persist → **200**; DB fail **503**. Observe v2 header; no EdDSA in Core.
- Org A ≠ Org B (grants + RLS). Exact `cloudinary_asset_id` + `version` for approval.
- Prod `www.ipix.co` trigger unchanged until **1115** with rollback written.

Dumps: [../archive/cloudinary/](../archive/cloudinary/).

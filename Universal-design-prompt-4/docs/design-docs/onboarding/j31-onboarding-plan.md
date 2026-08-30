# iPix Onboarding — Progress Task Tracker + Forensic Audit

**Audit date:** 2026-08-01  
**Baseline:** `origin/main` @ `aa047ad1`  
**Production:** https://www.ipix.co (Vercel)  
**Supabase prod:** `nvdlhrodvevgwdsneplk` (fashionos)  
**Supabase staging/QA candidate:** `wtuhdynujhszsbwxlbdi` (ipix-planner-staging)  
**Mode:** READ-ONLY — no code, Linear, Supabase, or production changes made

**Verdict up front:** Onboarding is the right first feature. UI shell + tenant security are real. The end-to-end “new brand reaches Ready” journey is **not** launch-ready yet. Fastest safe Vercel beta path is finish OAuth → sessions/RPC → DNA contract (parallel) → wire crawl/approval → Playwright + allowlisted prod smoke.

---

## Scorecard

| Area | Complete % | Production proof % | Status | Biggest gap |
| --- | ---: | ---: | --- | --- |
| Authentication entry | 70 | 55 | 🟡 | Google OAuth drops redirect on prod (`main`); fix in PR #700 |
| Onboarding UI | 95 | 90 | 🟢 | Authed prod walk 2026-08-01: screens 1–5,7,8,13 + `#12`→13 timer proven |
| Draft persistence | 5 | 0 | ⚪ | No `onboarding_sessions` table |
| Organization/brand creation | 40 | 35 | 🟡 | Old 2-round-trip `createOrgAndBrand` still live |
| Website crawl | 55 | 35 | 🟡 | Firecrawl exists; not wired to `/onboarding` v2 |
| Brand DNA | 40 | 25 | 🟡 | Edge schema exists; Mastra still `{ ok: boolean }` |
| Realtime progress | 20 | 10 | 🔴 | `brands` not in Realtime publication |
| Human approval | 50 | 30 | 🟡 | Approve path exists; not onboarding-cutover |
| Brand Hub handoff | 40 | 30 | 🟡 | `/app/onboarding` still the writable path |
| Security | 92 | 92 | 🟢 | IPI-809 PR1+PR2 live on prod |
| QA/testing | 45 | 15 | 🟡 | Strong unit UI tests; no Playwright onboarding journey |

**Overall scores**

| Metric | Score |
| --- | ---: |
| Onboarding implementation completeness | **38%** |
| Onboarding production readiness | **28%** |
| Security confidence | **90%** |
| Test confidence | **52%** |
| Linear plan accuracy | **82%** |

Legend: 🟢 VERIFIED · 🟡 PARTIAL · 🔴 BROKEN · ⚪ NOT IMPLEMENTED · ⏸ DEFERRED

---

## Step-by-step journey matrix (SSOT)

| Journey step | Code exists? | Works locally? | Works on ipix.co? | Test proof | Linear task | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Signed-out opens `/onboarding` | 🟢 middleware + `(onboarding)` route | 🟢 unit middleware contract | 🟢 redirects to login | middleware + flow tests | **IPI-833 · ONB2-UI-001** | 🟢 |
| Redirect to login preserves target | 🟢 `redirect=/onboarding` | 🟢 | 🟢 `?redirect=%2Fonboarding` browser-proven 2026-08-01 | login-form tests | **IPI-833** / **IPI-837** | 🟢 |
| Login with email/password returns to target | 🟢 `safeRedirect` + `router.push` | 🟢 unit | ⚪ full login not run (no allowlisted write) | login-form tests | **IPI-837** (email already OK) | 🟡 |
| Login with Google returns to `/onboarding` | 🟡 PR #700 only | 🟡 on preview branch | 🔴 `main` hardcodes `/app` | callback tests on PR; smoke unchecked | **IPI-837 · AUTH-OAUTH-001** | 🔴 on prod |
| Deep link `/onboarding#1` (screen 1 entry) | 🟢 hash parse + `replaceState` | 🟢 unit/history tests | 🟢 gate live; `#1` kept on login URL | history + nav tests | **IPI-833** | 🟢 gate / 🟡 screens behind auth |
| Complete onboarding screens (13) | 🟢 local-state UI | 🟢 34 flow + 21 nav tests | 🟢 authed Cursor browser 2026-08-01 | Vitest 144 + live walk | **IPI-833** | 🟢 |
| Save and resume draft | ⚪ | ⚪ | ⚪ | none | **IPI-832 · ONB2-DB-001** | ⚪ |
| Create exactly one org + brand | 🟡 non-atomic helper | 🟡 unit mocks | 🟡 via `/app/onboarding` only | onboarding.test.ts (random slug) | **IPI-832** | 🔴 for idempotency |
| Start real website crawl | 🟢 `invokeStartBrandCrawl` + edge | 🟡 brand-hub path | 🟡 not from `/onboarding` v2 | orchestration tests grep old page | **IPI-835 · ONB2-INT-001** | 🟡 |
| Show real crawl/analysis progress | 🟡 fake timer on screen 12; banner listens `brands` | 🟡 | 🔴 Realtime gap | banner tests exist; fake timer intentional | **IPI-835** | 🔴 truthfulness |
| Generate evidence-backed Brand DNA | 🟡 Edge schema; Mastra booleans | 🟡 | 🟡 partial pipeline | workflow tests (not fail-closed DNA) | **IPI-834 · ONB2-AI-001** | 🟡 |
| Human reviews and approves | 🟢 approve route + promote | 🟡 | 🟡 Brand Hub path | workflow + approve coverage | **IPI-835** | 🟡 |
| Brand becomes ready | 🟢 `promoteBrandDraft` → `ready` | 🟡 | 🟡 | unit | **IPI-835** / **IPI-836** | 🟡 |
| User enters Brand Hub | 🟢 `/app/brand` | 🟢 | 🟢 for existing brands | brand-hub tests | post-onboarding | 🟢 (separate from v2) |

---

## Linear task board (easy view)

Project: [DESIGN V2 — Operator React Parity](https://linear.app/amo100/project/design-v2-operator-react-parity-e276f28e26a0/issues) · Milestone **DV2-M3 · Workspace Parity**

| Dot | Task | Linear | Code | Prod | PRs | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 🟢 | **IPI-809 · SEC-ONB-001 — Stop Any Logged-In User From Seeing Every Organization** | Done | merged | ✅ RLS + EXECUTE grants verified live | #655 #681 #682 | Do **not** reopen — prod SQL matches AC |
| 🟢 | **IPI-833 · ONB2-UI-001 — Standalone Onboarding Route, Screens, and Deterministic State Machine** | Done | merged | ✅ auth gate + authed screen walk | #657 | Prod UI verified signed-in 2026-08-01; mobile/reduced-motion still IPI-843 |
| 🟡 | **IPI-837 · AUTH-OAUTH-001 — Preserve Safe Post-Login Redirect Through Google OAuth** | In Progress | PR open | ❌ not on prod | [#700](https://github.com/amo-tech-ai/lumina-studio/pull/700) CI green; smoke unchecked | **Next ship** |
| ⚪ | **IPI-832 · ONB2-DB-001 — Onboarding Sessions, Atomic Materialization RPC, and Database Authorization Proof** | Todo | none | no table/RPC | — | Can start slices A/B before OAuth merge |
| ⚪ | **IPI-834 · ONB2-AI-001 — Evidence-Backed Brand DNA Schema and Mastra Workflow Contract Enforcement** | Todo | Edge schema only | Edge validates; Mastra fail-open | — | Truly parallel with 832 |
| ⚪ | **IPI-835 · ONB2-INT-001 — Real Session, Crawl, Realtime Progress, and Approval Integration With Recovery** | Todo | none for v2 wire | brands not published | — | Blocked by 832+833+834 (+837 preferred) |
| ⚪ | **IPI-836 · ONB2-VERIFY-001 — Playwright QA Journeys and Controlled Production Verification** | Todo | no `e2e/14-onboarding` | — | — | Blocked by 835 + 829 + 809(Done) |
| ⚪ | **IPI-829 · ONB-QA-001 — Provision a QA Supabase Project and Wire QA_DATABASE_URL** | Todo | staging 54+ migrations behind | staging ≠ prod schema | — | Hard block for Playwright only |
| ⚪ | **IPI-840 · ONB2-UI-002 — Sync Onboarding Address Bar With Clamped Hash on Invalid Deep Links** | Todo | mostly fixed; popstate hole | hash lost behind login | — | Low; non-blocking |
| ⏸ | **IPI-842 · ONB2-UI-003 — Analysis-Screen Timer Resume After Tab Backgrounding** | Canceled | — | — | — | Correctly canceled pending 835 |
| ⚪ | **IPI-843 · QA-001 — Mobile + prefers-reduced-motion on Deployed Preview** | Todo | local only | not proven | — | Fold into 836 after 835 |
| ⏸ | **IPI-877 · PLATFORM-NATIVE-001 — Use Native Platform Features Before Custom Code** | Backlog | governance | — | — | Parallel support; does not block OAuth |
| 🟡 | **IPI-831 · ONB2-EPIC-001 — Onboarding V2 Delivery…** | In Progress | tracker | — | #676 docs | Parent only |

### Dependency graph (corrected for launch)

```text
IPI-809 🟢 Done ──────────────────────────────┐
IPI-833 🟢 Done ──► IPI-837 🟡 (PR #700) ──┐ │
                         │                 │ │
IPI-832 ⚪ ◄── can start now (∥ OAuth)     │ │
IPI-834 ⚪ ◄── can start now (∥ 832)       │ │
         │                                 │ │
         └──────────► IPI-835 ⚪ ◄─────────┘ │
                         │                   │
IPI-829 ⚪ ─────────────► IPI-836 ⚪ ◄────────┘
                         │
                    Vercel beta smoke
```

---

## Evidence highlights

### Repo (`origin/main` @ `aa047ad1`)

- Standalone route: `app/src/app/(onboarding)/onboarding/page.tsx` (sibling of operator shell)
- Legacy writable wizard still live: `app/src/app/(operator)/app/onboarding/page.tsx`
- Middleware gates `/onboarding` like `/app`
- OAuth on `main`: callback `successUrl = ${origin}/app` — Google loses redirect
- `createOrgAndBrand`: two inserts + best-effort delete; random slug suffix
- Mastra: `extractProfile` / `fanOutEnrichment` still boolean outputSchemas
- No `e2e/*onboarding*` Playwright spec
- Focused Vitest on main worktree: **10 files / 144 tests passed** (2026-08-01)

### Supabase production (MCP SQL)

| Probe | Result |
| --- | --- |
| `onboarding_sessions` | **missing** (0) |
| `materialize_onboarding_session` | **missing** |
| `organizations` SELECT `USING (true)` | **0** — member/owner only |
| `is_org_*` PUBLIC/anon EXECUTE | **false**; authenticated **true** |
| Trigger helpers EXECUTE for client roles | **false** |
| Realtime publication | `brand_crawls`, `brand_crawl_results` only — **`brands` absent** |
| Latest migrations | includes `20260730220000_ipi809_revoke_org_function_execute` |

### Staging / QA (`wtuhdynujhszsbwxlbdi`)

- ACTIVE_HEALTHY but latest migration still `20260720032827`
- **≥54 migrations behind** production — not safe for Playwright yet (**IPI-829**)

### Production browser (safe probes)

1. `https://www.ipix.co/onboarding` → `https://www.ipix.co/login?redirect=%2Fonboarding` 🟢  
2. Google button visible on login 🟢  
3. `#999` deep link → login with redirect `/onboarding` (hash client-side; clamp after auth is IPI-840) 🟡  
4. Full authenticated crawl/approve path — **not run** (destructive / needs allowlisted QA user)

### Production probe — [`/onboarding#1`](https://www.ipix.co/onboarding#1) (2026-08-01)

Re-checked live (agent browser has **no shared login cookies** — still sees Sign In even when a human is logged in elsewhere). This is the **screen-1 deep link**, not a signed-in UI proof.

| Check | Result | Status |
| --- | --- | --- |
| URL opens on production | Yes — route is deployed on Vercel | 🟢 |
| Signed-out / agent browser | Lands on **Sign In \| iPix** | 🟢 |
| Final URL (unauthenticated) | `https://www.ipix.co/login?redirect=%2Fonboarding#1` | 🟢 |
| Path preserved for post-login | `redirect=/onboarding` (hash `#1` stays on the login document only; not in the query) | 🟢 path / 🟡 hash |
| Login UI present | Google + email Sign in / Sign up | 🟢 |
| Screen 1 marketing UI while signed out | **No** — middleware correctly blocks | 🟢 (expected) |
| Human logged into Cursor browser | 🟢 session shared — URL `https://www.ipix.co/onboarding#1`, title **Set up your brand \| iPix** | 🟢 |
| After login, screen 1 visible | 🟢 **Verified 2026-08-01** — see authenticated walk below | 🟢 |

**What `#1` proves is already complete (IPI-833 production slice)**

- Standalone `/onboarding` is live (not only local)
- Auth gate matches `/app` protection
- Deep-link style entry `#1` does not 404 or bypass login
- Redirect target for return-after-login is `/onboarding`

**What `#1` does *not* prove (until signed-in session is inspected)**

- Marketing screen 1 body (proof tiles) on production
- Screens 2–13, Continue disabled rules, Back/history, reduced-motion
- Draft save, crawl, DNA, approval (later tickets)

### Codebase verification — **IPI-833 · ONB2-UI-001** (complete on `origin/main`)

Source of truth: `app/src/app/(onboarding)/`, `app/src/components/onboarding/`, `app/src/lib/onboarding/{navigation,use-screen-history,validate-url}.ts`, middleware, Vitest. Flow comment: **local state only — no network / Supabase / AI**.

| AC / deliverable | Evidence | Status |
| --- | --- | --- |
| Sibling `(onboarding)` route group (not inside operator shell) | `app/src/app/(onboarding)/onboarding/page.tsx` | 🟢 |
| Dynamic client load (Worker budget) | `onboarding-flow-loader.tsx` `dynamic(..., { ssr: false })` | 🟢 |
| 13-screen linear counter | `navigation.ts` `FIRST_SCREEN=1` … `LAST_SCREEN=13` | 🟢 |
| 4 question components | `BuildType` / `BrandDetails` / `SalesChannels` / `GrowthPreference` | 🟢 |
| 7 distinct marketing bodies | `marketing-bodies.tsx` — proof-tiles, score, testimonial, phone, goals, funnel, content-pack (+ `data-testid`s) | 🟢 |
| Analysis placeholder (timer, not crawl) | `analysis-progress-screen.tsx` + `Progress` + `aria-live="polite"` | 🟢 (intentional fake) |
| Payoff shell (not real DNA) | `brand-dna-payoff-screen.tsx` — pillars as shape/hints only | 🟢 |
| `ctaDisabled` on 2/4/5/7 | `navigation.ts` | 🟢 |
| `canBack` / `canSkip` | false on 1 & 12; skip 4–7 | 🟢 |
| Hash deep links + clamp | `parseScreenFromHash` + `clampScreen`; mount `replaceState` | 🟢 |
| History Back/Forward | `use-screen-history.ts` push/replace/pop + depth | 🟢 |
| No fabricated “47 pages found” | Comment + flow test assertion | 🟢 |
| No NavSidebar / chat / operator chrome | Separate route group + no network in flow | 🟢 |
| Middleware gates `/onboarding` | `middleware.ts` + `operator-middleware-contract.test.ts` | 🟢 |
| Focus moves to heading on transition | `onboarding-flow.tsx` effect | 🟢 |
| Screen 13 Continue → `/app` | `goNext` when `LAST_SCREEN` | 🟢 |
| Legacy `/app/onboarding` left untouched | Still present for **IPI-835** cutover | 🟢 (by design) |
| Unit/component tests | nav 21 + flow ~36 + history 6 + url 7 + middleware | 🟢 (144 focused suite green) |
| Raw hex colours banned | 🟡 channel brand glyphs in `sales-channels.data.ts` still use platform hex (IG/FB/etc.) | 🟡 minor |
| Authenticated prod walk of screens 1–13 | Cursor browser signed-in 2026-08-01 (evidence below) | 🟢 |
| Google return to `/onboarding` | Not IPI-833 — **IPI-837** | 🔴 on prod |

### Authenticated production walk (Cursor browser, 2026-08-01)

Signed-in session on `https://www.ipix.co/onboarding`. No operator chrome (no NavSidebar / chat). Local-state wizard only — no crawl/DNA network observed.

| `#` | Observed | Prod |
| ---: | --- | --- |
| 1 | “Build your fashion brand with AI” · 5 proof tiles · **Get started** · `1/13` · URL `#1` | 🟢 |
| 2 | “What are you building?” · Continue **disabled** until pick · Back · after Fashion → Continue enables · `#2` | 🟢 |
| 3 | “iPix builds your Brand DNA fast” · scores 32→88 · `#3` | 🟢 |
| 4 | “Tell us about your brand” · name + optional URL · Continue **disabled** · **Skip** present · `#4` | 🟢 |
| 5 | “Where is your brand listed?” · IG/FB/Shopify/web/TikTok/Etsy/Amazon/eBay · Continue disabled · Skip · `#5` | 🟢 |
| 7 | “Preferred way to grow?” · Continue disabled · Skip · `#7` | 🟢 |
| 8 | “Turn your brand into cash flow…” (ads marketing) · `#8` | 🟢 |
| 12→13 | Navigate `#12` auto-settled to `#13` (placeholder timer completes) | 🟢 fake-by-design |
| 13 | “Your Brand DNA is next” · Voice/Palette/Audience/Positioning hints · **Open iPix** · Back · `13/13` | 🟢 shell only |

**Not claimed:** real crawl, draft save, evidence DNA, Google OAuth return (still **IPI-837**), mobile/reduced-motion (**IPI-843**).

**Bottom line for IPI-833:** **code + tests + auth gate + signed-in prod UI = Done.** Next launch gap is OAuth (**IPI-837**) then sessions/DNA/wire (**832/834/835**).

### Open PR

- [#700 · IPI-837 OAuth redirect carrier](https://github.com/amo-tech-ai/lumina-studio/pull/700) — MERGEABLE, CI green, preview: `ipix-operator-git-ipi-837-oauth-redirect-carrier-mdeai.vercel.app`  
- Remaining AC: preview/prod Google smoke (CodeRabbit flagged unchecked smoke)

---

## Verified complete

- Tenant org SELECT isolation live (no `USING (true)`)
- Org helper/trigger EXECUTE grants hardened live
- Standalone `/onboarding` 13-screen UI + deterministic navigation on `main`
- **Signed-in prod walk** (2026-08-01 Cursor browser): screens 1–5, 7, 8, 13 live; CTA disable + Skip; `#12` timer → 13; no operator chrome
- Middleware auth gate for `/onboarding` on production — incl. [`/onboarding#1`](https://www.ipix.co/onboarding#1) → `login?redirect=%2Fonboarding#1`
- Login redirect query preserved for email path and for the gate itself
- “47 pages found” not rendered (guarded by test)
- Edge brand-profile JSON Schema SSOT exists
- Crawl/approve/promote machinery exists for Brand Hub (not v2 cutover)

## Partial

- Google OAuth redirect (code in PR #700; not production)
- Brand DNA (Edge validates; Mastra fail-open)
- Crawl + progress (real infra; fake timer on onboarding screen 12; Realtime incomplete)
- Legacy `/app/onboarding` still creates brands (non-idempotent)
- Mobile / reduced-motion only locally (IPI-843)

## Broken (evidence-backed)

1. **Google → always `/app` on production** (`auth/callback/route.ts`)
2. **Progress truthfulness:** banner subscribes to `brands`; table not in Realtime publication
3. **Non-atomic org+brand create** on current helper (orphan risk / double-submit)
4. **No draft resume** for v2 wizard

## Missing (required for beta journey)

1. `onboarding_sessions` + `materialize_onboarding_session` (**IPI-832**)
2. Mastra contract enforcement / evidence claims (**IPI-834**)
3. Session + crawl + Realtime + approval cutover; retire `/app/onboarding` (**IPI-835**)
4. Playwright journeys + allowlisted prod proof (**IPI-836**)
5. QA DB schema parity + `QA_DATABASE_URL` (**IPI-829**) — for verify lane

## Stale Linear claims

| Claim | Reality |
| --- | --- |
| IPI-831 epic description still describes pre-809 leak as live | Fixed; PR2 also live — epic body aged |
| IPI-836 body still discusses creating `NEXT_PUBLIC_ONBOARDING_V2_ENABLED` in places | Correction section says use server allowlist — body inconsistent |
| IPI-829 Steps 5–6 `migration repair` for absent Mastra schema | Correction header forbids this; steps below still describe old unsafe pattern |
| IPI-832 Linear `blockedBy` empty vs epic “blocked by 829” | Description correctly says only race/integration needs QA; Linear relations should stay non-blocking for A/B |
| IPI-809 description historically said PR2 not shipped | Status Done + prod SQL confirm PR2 shipped — description lag only |

---

## Correct next order

| Order | Task | Parallel? | Depends on | Evidence required |
| ---: | --- | --- | --- | --- |
| 1 | Merge **IPI-837** after preview Google smoke | with 832/834 prep | IPI-833 Done | Preview: Google → `/onboarding` |
| 2a | **IPI-832** slice A migration | yes with 837/834 | none for A/B | pgTAP 008 |
| 2b | **IPI-834** schema + Mastra fail-closed | yes with 832 | none | parity tests |
| 2c | **IPI-829** QA schema catch-up | yes (support) | human plan decision | staging list == prod intent |
| 3 | **IPI-832** slice B/C module + race test | after A; C needs QA | 829 for race only | Promise.all same IDs |
| 4 | **IPI-835** Realtime + session wire + cutover | no | 832+833+834 (+837) | brands publication + reconnect ≠ fail |
| 5 | **IPI-836** Playwright + allowlist smoke | no | 835+829+809 | SQL row counts + one ready brand |
| ∥ | **IPI-840**, **IPI-843**, **IPI-877** | yes | — | non-blocking |

### Answers to plan questions

| Question | Answer |
| --- | --- |
| Is dependency order correct? | **Mostly yes.** Prefer OAuth first for Google-heavy signup, but **832/834 must not wait** on 837. |
| Can 832 begin before 837 finishes? | **Yes.** Sessions/RPC do not need OAuth carrier. |
| Which 832 slices need QA? | **Slice C race/integration only.** A (migration) + B (module) ship without `QA_DATABASE_URL`. |
| Is 834 independent? | **Yes** — schema/Mastra only; no session table required. |
| What blocks 835? | **832 + 833(Done) + 834**; 837 strongly preferred for Google entry. |
| What blocks 836? | **835 + 829**; 809 already Done. |

---

## Launch blockers only (Vercel beta)

1. Ship **IPI-837** (Google lands on `/onboarding`)
2. Ship **IPI-832** (idempotent materialize + draft resume)
3. Ship **IPI-834** (fail-closed evidence DNA)
4. Ship **IPI-835** (real progress + approval + cutover; publish `brands` Realtime columns)
5. Ship **IPI-836** happy-path proof on QA + one allowlisted prod brand

## Post-beta (do not block)

- Cloudflare Workers cutover / OpenNext bundle work
- Operator Stripe / payments (**IPI-882** scope decision stays parallel governance)
- Native-first audits (**IPI-877**–**IPI-881**)
- Cleaning ~5.8k CI fixture orgs
- Talent onboarding SCR-24
- IPI-840 popstate hash polish (unless it blocks resume UX)

---

## Test inventory

| Test layer | Exists | Passing | What it proves | Missing proof |
| --- | ---: | ---: | --- | --- |
| Unit nav/URL/history | 🟢 | 🟢 144 focused | Screen machine, no fake crawl copy | popstate hash sync (840) |
| Login + callback unit | 🟢 | 🟢 on main; 🟡 fuller on #700 | Email redirect; OAuth carrier on PR | Prod Google smoke |
| Orchestration unit | 🟢 | 🟢 | Old `/app/onboarding` flow shape | RPC materialize |
| Mastra workflow unit | 🟢 | 🟢 | Crawl/enrich plumbing | Fail-closed DNA claims |
| pgTAP org isolation/grants | 🟢 | 🟢 (CI + prod) | Tenant + EXECUTE | onboarding_sessions 008 |
| Realtime / banner | 🟡 | unit only | Component states | Live `brands` publication |
| Playwright onboarding | ⚪ | — | — | e2e/14 journeys |
| Production smoke | 🟡 | gate only | Login redirect | Full ready brand |

---

## Final verdict

1. **Is onboarding the correct first feature?** **Yes.** It is the shortest path that proves auth → tenant data → Mastra → Realtime → Brand Hub together (see `j-31-plan-features.md`).
2. **What is already complete?** Security isolation (**IPI-809**), standalone UI (**IPI-833**), production auth gate to login with redirect query, Edge brand-profile SSOT, existing crawl/approve infrastructure for Brand Hub.
3. **Next three actions**  
   1. Finish preview/prod Google smoke and merge **IPI-837 / PR #700**  
   2. Start **IPI-832** migration slice A and **IPI-834** in parallel  
   3. Kick **IPI-829** schema catch-up so Playwright has a non-prod target
4. **What should not block beta?** Cloudflare migration, Stripe productization, native-first governance epics, IPI-840/842 polish, cleaning fixture orgs.
5. **Can the current plan launch safely on Vercel today?** **No.** Safe beta needs the five blockers above. After those, **yes** — Vercel is the correct host; Cloudflare cutover is post-beta.

---

## Approval gate

This document is the audit + tracker only. **Await approval before** merging PR #700, applying migrations, changing Linear statuses, or running authenticated production writes.

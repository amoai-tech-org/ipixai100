# IPI-1067 · SHOOT-001 — Let Operators Browse Shoots and Open Complete Shoot Records

**File:** `dash-backend/IPI-1067-SHOOT-001.md`  
**Linear action:** UPDATE  
**MIGRATEv2:** Yes (already)  
**READY TO PATCH LINEAR:** YES  
**Audit:** Batch 1 · local 90→**~99/100** (correct live “require RPC” → **direct-read-first**)

---

## 0. Faster / better — FIRST / default method

```text
1. Start from clean current origin/main
2. Resolve AUTH-002 trusted active org
3. Implement smallest server-only canonical data query first
4. Explicitly constrain every list/detail read to trusted org; RLS = defense-in-depth
5. Prove one cross-org negative case before porting UI
6. Reuse Lumina presentation only after data contract is green
7. Do not add schema/RPC/media infrastructure unless direct reuse cannot meet ACs
8. Targeted tests → typecheck → build → browser
```

### List (no migration required)

```text
trusted org → brands WHERE org_id = trustedOrgId → brand IDs
→ shoot_portfolio_view WHERE brand_id IN (...)
```

Canonical SSOT: `shoot.shoots`. View exposes `brand_id`, not `org_id`. Membership-union ≠ active-org.

### Detail — direct-query FIRST; RPC only if justified

```text
FIRST try:
  trusted org → allowed brand IDs
  → shoot.shoots WHERE id = shootId AND brand_id IN (...)
  → related display data with same scope

Only add get_shoot_detail_for_org(shoot_id, trusted_org_id) (or equivalent) if:
  - detail needs several tables returned atomically, OR
  - existing RLS/API makes direct schema access awkward, OR
  - current detail JSON contract is substantially reusable, OR
  - query count/consistency justifies it

Browser never establishes trusted_org_id.
Do not ship membership-union-only get_shoot_detail as active-org authority.
```

---

## 1. Task full name

IPI-1067 · SHOOT-001 — Let Operators Browse Shoots and Open Complete Shoot Records

## 2. Current V2 owner / scope

Browse list/detail + lifecycle tab IA. No wizard/HITL/media/booking.  
**Routes:** `/app/shoots`, `/app/shoots/[shootId]`.

## 3. Exact Lumina URLs / files to inspect

- https://github.com/amoai-tech/luminaai/tree/main/app/src/components/shoot
- https://github.com/amoai-tech/luminaai/tree/main/app/src/app/(operator)/app/shoots
- Prefer `amoai-tech/luminaai` over stale studio attachments

## 4. SELECTIVE COPY / ADAPT

Keep: `ShootsListWorkspace`, `ShootCard`, display-only `ShootDetailWorkspace`, filtering/search, lifecycle tab IA, loading/error tests.

## 5. ADAPT

Trusted-org list/detail as §0; unsupported tabs → empty/disabled.

## 6. DROP

Agent Context; Generate Shot List; ActiveBrand mutations; Wizard; HITL; Save; Booking mutation; upload/media; AI activity; `public.shoots` SSOT regression.

## 7. Exact additions / corrections for Linear addendum

- **Replace** “require atomic org-bound function” as default with **direct trusted-org server reads first; RPC only if justified**
- Keep list via brand IDs + `shoot_portfolio_view`
- Data-contract-first §0; lean skills wording

## 8. Acceptance criteria

- [ ] List scoped through active-org brand IDs
- [ ] Detail: direct-query-first; RPC only if justified; never membership-union-only
- [ ] Org A cannot open Org B shoot; foreign ID → 404
- [ ] Unsupported tabs empty/disabled
- [ ] No wizard/HITL/Save/booking/media
- [ ] Loading / empty / error / unauthorized matrix

## 9. Dependencies

Hard: APP-001 + AUTH-002 (live). Soft before Rail. Unblocks PLAN with BRAND.

## 10. READY TO PATCH LINEAR

**YES** — prepend addendum correcting detail strategy (critical delta vs live body).

---

# AUTHORITATIVE FULL-URL + PRODUCTION AUDIT REFRESH — 2026-09-03

**Code authority:** audit and implement from a clean/current `amoai-tech/ipixai@main` / `origin/main`, not the current dirty docs worktree. At audit time local HEAD was `dbc6f0b...` while `origin/main` was `b034423...`. Re-check SHA at task start.

**Global execution rule:** inspect `package.json` + installed source/types first; current package/runtime contracts beat stale issue pins. The current skill tree has no `ponytail` skill, so use explicit cheapest-proof-first verification instead.

**Official implementation authority when relevant:**
- https://github.com/vercel/next.js
- https://github.com/supabase/supabase
- https://github.com/mastra-ai/mastra
- https://github.com/CopilotKit/CopilotKit

Use the official repository only to resolve current framework/library behavior; installed versioned source/types in ipixai still win when upstream `main` has moved ahead.

## Exact Lumina sources
- https://github.com/amoai-tech/luminaai/blob/main/app/src/app/(operator)/app/shoots/page.tsx
- https://github.com/amoai-tech/luminaai/blob/main/app/src/components/shoot/shoots-list-workspace.tsx
- https://github.com/amoai-tech/luminaai/blob/main/app/src/components/shoot/shoots-list-workspace.test.tsx
- https://github.com/amoai-tech/luminaai/blob/main/app/src/app/(operator)/app/shoots/[shootId]/page.tsx
- https://github.com/amoai-tech/luminaai/blob/main/app/src/components/shoot/shoot-detail-workspace.tsx
- https://github.com/amoai-tech/luminaai/blob/main/app/src/components/shoot/shoot-detail-workspace.test.tsx
- https://github.com/amoai-tech/luminaai/blob/main/app/src/lib/shoot/get-shoot-detail.ts

## Current Supabase truth
Canonical V2 shoot truth is `shoot.shoots`; legacy `public.shoots` also exists and must not be revived. Existing `public.get_shoot_detail(p_shoot_id)` is SECURITY DEFINER, so it is **not automatically active-org authority**.

## Faster/better approach
Trusted org → allowed brand IDs → direct `shoot.shoots` list/detail first. Add/reuse an RPC only if a direct server query cannot satisfy an observable requirement cleanly.

## Red flags / fixes
- SECURITY DEFINER detail RPC without active-org binding → direct scoped read or explicit org-bound contract.
- Membership-union visibility → explicit active-org brand filter.
- Legacy view becomes canonical → prohibit.
- Wizard/HITL/media scope creep → separate tasks.

## Score / production gate
Correctness 99 · Security 99 · Reuse 99 · Overall **99/100 provisional**. Success = Org A list/detail cannot expose Org B, foreign IDs 404, unsupported tabs honest, no `public.shoots`, targeted tests/typecheck/build/browser pass.


# Security Advisor register

**Task:** [IPI-1039 · SB-V2-003 — Give Every Supabase Security Warning an Owner and Clear Action](https://linear.app/amo100/issue/IPI-1039)  
**Project:** `nvdlhrodvevgwdsneplk` (fashionos)  
**Snapshot:** 2026-08-25 · Supabase MCP `get_advisors` type=`security` (re-read same day)  
**Goal:** classify leftovers. **Not** “all green.”

Official: [Database Advisors](https://supabase.com/docs/guides/database/database-advisors) · [Functions](https://supabase.com/docs/guides/database/functions) · [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) · [API security](https://supabase.com/docs/guides/api/securing-your-api) · [Product security](https://supabase.com/docs/guides/security/product-security)

This ticket does **not** mass-revoke EXECUTE, enable Have I Been Pwned, or move extensions.

---

## Snapshot totals

| Count | Advisor name | Level | Disposition | Owner |
|------:|--------------|-------|-------------|-------|
| 34 | `authenticated_security_definer_function_executable` | WARN | KEEP (EXECUTE) | [IPI-1029 · IPI-V2-000 · SB-FIX-002 — Classify authenticated SECURITY DEFINER RPCs (no mass revoke)](https://linear.app/amo100/issue/IPI-1029) (Done) |
| 3 | `extension_in_public` | WARN | KEEP | [IPI-1030 · IPI-V2-000 · SB-EXT-001 — KEEP public extensions (vector, pg_trgm, btree_gist)](https://linear.app/amo100/issue/IPI-1030) (Done) |
| 5 | `rls_enabled_no_policy` | INFO | KEEP | Per-table owners below |
| 1 | `auth_leaked_password_protection` | WARN | SEPARATE TASK | [IPI-863 · AUTH-V2-001 — Block Known Leaked Passwords for iPix Accounts](https://linear.app/amo100/issue/IPI-863) |

**43 findings in this live snapshot. Unexplained P0/P1: none** (HIBP is owned, not missing).

### Not in this snapshot (do not invent rows)

Live `get_advisors` returned **zero** `anon_security_definer_function_executable` and **zero** `function_search_path_mutable` rows. Catalog check: `public.get_brand_assets` has `anon` EXECUTE **false** and `authenticated` EXECUTE **true**. If those advisor names reappear, add rows in a docs-only refresh — do not treat an older contract as current.

---

## Register

| Finding | Object | Intentional? | Action | Owner | Priority | Proof | Follow-up |
|---------|--------|--------------|--------|-------|----------|-------|-----------|
| DEFINER ×34 | See object list below | Yes — signed-in operator RPCs (EXECUTE) | KEEP EXECUTE | [IPI-1029 · IPI-V2-000 · SB-FIX-002 — Classify authenticated SECURITY DEFINER RPCs (no mass revoke)](https://linear.app/amo100/issue/IPI-1029) | P2 lint / P0 if revoked | Advisor + `prosecdef` + `has_function_privilege(authenticated, …, execute)` = 34 | Per-function body authz **UNVERIFIED** here. IPI-1029 optional later: `claim_lead_draft` / `crm_convert_deal`. Do **not** mass-revoke. |
| Extensions ×3 | `public.vector`, `public.pg_trgm`, `public.btree_gist` | Yes — indexes/search depend on them | KEEP | [IPI-1030 · IPI-V2-000 · SB-EXT-001 — KEEP public extensions (vector, pg_trgm, btree_gist)](https://linear.app/amo100/issue/IPI-1030) | P3 | `pg_extension` schema=`public` | None (do not move without proof) |
| RLS no policy | `chatbot_conversations` | Yes — backend-only | KEEP fail-closed | [IPI-872 · SB-HYGIENE-003 — Re-revoke chatbot_* table SELECT from anon/authenticated](https://linear.app/amo100/issue/IPI-872) (Done; historical [IPI-664 · SB-HYGIENE-001 — Reconcile migration history, enable HIBP, tighten service-only grants](https://linear.app/amo100/issue/IPI-664)) | INFO | RLS on + 0 JWT policies + **no** `anon`/`authenticated` table grants | Do not add open SELECT policies |
| RLS no policy | `chatbot_events` | Yes — backend-only | KEEP fail-closed | [IPI-872 · SB-HYGIENE-003 — Re-revoke chatbot_* table SELECT from anon/authenticated](https://linear.app/amo100/issue/IPI-872) | INFO | same | same |
| RLS no policy | `chatbot_messages` | Yes — backend-only | KEEP fail-closed | [IPI-872 · SB-HYGIENE-003 — Re-revoke chatbot_* table SELECT from anon/authenticated](https://linear.app/amo100/issue/IPI-872) | INFO | same | same |
| RLS no policy | `processed_firecrawl_webhooks` | Yes — backend-only | KEEP fail-closed | [IPI-888 · SB-HYGIENE-004 — Revoke lingering anon/authenticated SELECT on processed_firecrawl_webhooks](https://linear.app/amo100/issue/IPI-888) | INFO | same | same |
| RLS no policy | `media_size_specs` | Yes — retired lookup, JWT deny | KEEP fail-closed | [IPI-1028 · IPI-V2-000 · SB-FIX-010 — Restore media_size_specs retirement metadata](https://linear.app/amo100/issue/IPI-1028) | INFO | same | same |
| Leaked passwords | Auth | No — should enable on Pro+ | Do not enable here | [IPI-863 · AUTH-V2-001 — Block Known Leaked Passwords for iPix Accounts](https://linear.app/amo100/issue/IPI-863) | P1 product | Advisor WARN; org plan **free** | Enable HIBP after Pro |

---

## DEFINER authz (why KEEP EXECUTE)

Think of these as **staff-only closet keys that still should check the badge**. `SECURITY DEFINER` runs with the function owner so the RPC can read planner/lookbook rows; PostgREST exposes them at `/rest/v1/rpc/…` to `authenticated` **on purpose**. Revoking EXECUTE would stop SS26 planning after login.

This register **reuses** IPI-1029 for the EXECUTE/KEEP classification. It does **not** prove, function-by-function, that every body checks `auth.uid()` / org membership, a pinned `search_path`, ownership, and write-safety. Treat that body audit as **UNVERIFIED** until a dedicated pass (IPI-1029 already names `claim_lead_draft` and `crm_convert_deal` as optional later work). Class-level claim: operators need these RPCs after login; mass-revoke is the product-breaking “fix.”

### Objects (34)

**planner (4):** `can_broadcast_instance`, `can_subscribe_instance`, `is_assigned`, `is_at_least`

**public (30):** `check_talent_availability`, `claim_lead_draft`, `create_booking_request`, `create_talent_profile_with_sources`, `crm_convert_deal`, `get_booking`, `get_brand_assets`, `get_or_create_shortlist`, `get_own_talent_profile`, `get_shoot_detail`, `is_org_editor_or_above`, `is_org_member`, `is_org_owner`, `is_organizer_team_member`, `list_bookings`, `list_notifications`, `mark_notifications_read`, `planner_approve_gate`, `planner_create_instance`, `planner_discard_gate`, `planner_get_member_names`, `planner_get_my_assignment`, `planner_invite_member`, `planner_remove_assignment`, `planner_shift_task`, `planner_update_role`, `planner_update_task`, `search_talent`, `toggle_shortlist_item`, `transition_booking`

---

## Backend-only tables (JWT)

RLS with **no** policies means the JWT roles see **zero rows** unless GRANTed and given a policy. Catalog check: `role_table_grants` for `anon`/`authenticated` on these five tables is **empty**. Edge/service paths remain the writers. If a product surface needs operator SELECT via PostgREST, open a **new** ticket — do not “fix” the INFO by adding a wide policy.

---

## Review trigger

Re-export Security Advisor and refresh this file (docs-only PR) when any of these land:

- new `SECURITY DEFINER` RPC, or change to function **EXECUTE**
- **default privileges** (`ALTER DEFAULT PRIVILEGES` / `pg_default_acl`)
- **RLS policies** or JWT **table grants** (including on the five backend-only tables — a grant-only change can leave the advisor **count** unchanged while fail-closed proof goes stale)
- public **extension** add/move / schema placement
- Auth **plan** or leaked-password setting

---

## Non-goals

- Mass EXECUTE revoke  
- HIBP enablement ([IPI-863 · AUTH-V2-001 — Block Known Leaked Passwords for iPix Accounts](https://linear.app/amo100/issue/IPI-863))  
- Moving `vector` / `pg_trgm` / `btree_gist`  
- Production grant changes  
- Completing the per-RPC body authz audit in this PR  

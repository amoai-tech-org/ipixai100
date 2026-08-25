# Security Advisor register

**Task:** [IPI-1039 · SB-V2-003 — Give Every Supabase Security Warning an Owner and Clear Action](https://linear.app/amo100/issue/IPI-1039)  
**Project:** `nvdlhrodvevgwdsneplk` (fashionos)  
**Snapshot:** 2026-08-25 · Supabase MCP `get_advisors` type=`security`  
**Goal:** classify leftovers. **Not** “all green.”

Official: [Database Advisors](https://supabase.com/docs/guides/database/database-advisors) · [Functions](https://supabase.com/docs/guides/database/functions) · [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) · [API security](https://supabase.com/docs/guides/api/securing-your-api) · [Product security](https://supabase.com/docs/guides/security/product-security)

This ticket does **not** mass-revoke EXECUTE, enable Have I Been Pwned, or move extensions.

---

## Snapshot totals

| Count | Advisor name | Level | Disposition | Owner |
|------:|--------------|-------|-------------|-------|
| 34 | `authenticated_security_definer_function_executable` | WARN | KEEP | [IPI-1029](https://linear.app/amo100/issue/IPI-1029) (Done) |
| 3 | `extension_in_public` | WARN | KEEP | [IPI-1030](https://linear.app/amo100/issue/IPI-1030) (Done) |
| 5 | `rls_enabled_no_policy` | INFO | KEEP | Wave 0 hygiene (fail-closed) |
| 1 | `auth_leaked_password_protection` | WARN | SEPARATE TASK | [IPI-863](https://linear.app/amo100/issue/IPI-863) |

**43 findings. Unexplained P0/P1: none.**

---

## Register

| Finding | Object | Intentional? | Action | Owner | Priority | Proof | Follow-up |
|---------|--------|--------------|--------|-------|----------|-------|-----------|
| DEFINER ×34 | See object list below | Yes — signed-in operator RPCs | KEEP | IPI-1029 | P2 lint / P0 if revoked | Advisor + `prosecdef` + `has_function_privilege(authenticated, …, execute)` = 34 | None (do not reopen) |
| Extensions ×3 | `public.vector`, `public.pg_trgm`, `public.btree_gist` | Yes — indexes/search depend on them | KEEP | IPI-1030 | P3 | `pg_extension` schema=`public` | None (do not move without proof) |
| RLS no policy ×5 | `chatbot_conversations`, `chatbot_events`, `chatbot_messages`, `media_size_specs`, `processed_firecrawl_webhooks` | Yes — backend-only | KEEP fail-closed | IPI-664 / 872 / 888 / SB-FIX-004 | INFO | RLS on + 0 JWT policies + **no** `anon`/`authenticated` table grants | Do not add open SELECT policies |
| Leaked passwords | Auth | No — should enable on Pro+ | Do not enable here | IPI-863 | P1 product | Advisor WARN; org plan **free** | Enable HIBP after Pro |

---

## DEFINER authz (why KEEP)

Think of these as **staff-only closet keys that still check the badge**. `SECURITY DEFINER` runs with the function owner so the RPC can read planner/lookbook rows; the function body must still check `auth.uid()` / org membership. PostgREST exposes them at `/rest/v1/rpc/…` to `authenticated` **on purpose**. Revoking EXECUTE would stop SS26 planning after login.

Pinned `search_path` is present on these objects (empty-string config is the “lock path” pattern used on several planner RPCs). This register does **not** re-open IPI-1029.

### Objects (34)

**planner (4):** `can_broadcast_instance`, `can_subscribe_instance`, `is_assigned`, `is_at_least`

**public (30):** `check_talent_availability`, `claim_lead_draft`, `create_booking_request`, `create_talent_profile_with_sources`, `crm_convert_deal`, `get_booking`, `get_brand_assets`, `get_or_create_shortlist`, `get_own_talent_profile`, `get_shoot_detail`, `is_org_editor_or_above`, `is_org_member`, `is_org_owner`, `is_organizer_team_member`, `list_bookings`, `list_notifications`, `mark_notifications_read`, `planner_approve_gate`, `planner_create_instance`, `planner_discard_gate`, `planner_get_member_names`, `planner_get_my_assignment`, `planner_invite_member`, `planner_remove_assignment`, `planner_shift_task`, `planner_update_role`, `planner_update_task`, `search_talent`, `toggle_shortlist_item`, `transition_booking`

---

## Backend-only tables (JWT)

RLS with **no** policies means the JWT roles see **zero rows** unless GRANTed and given a policy. Catalog check: `role_table_grants` for `anon`/`authenticated` on these five tables is **empty**. Edge/service paths remain the writers. Review trigger: if a product surface needs operator SELECT via PostgREST, open a **new** ticket — do not “fix” the INFO by adding a wide policy.

---

## Review trigger

Re-export Security Advisor when a new `SECURITY DEFINER` RPC, public extension, or Auth plan change lands. Update this file in a docs-only PR if counts drift.

---

## Non-goals

- Mass EXECUTE revoke  
- HIBP enablement ([IPI-863](https://linear.app/amo100/issue/IPI-863))  
- Moving `vector` / `pg_trgm` / `btree_gist`  
- Production grant changes  

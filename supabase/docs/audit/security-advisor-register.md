# Security Advisor Register

> **Ticket:** [IPI-1039 · SB-V2-003 — Give Every Supabase Security Warning an Owner and Clear Action](https://linear.app/amo100/issue/IPI-1039)
> **Live fetch:** 2026-09-03T02:57:24Z via MCP `supabase_get_advisors(type=security)`
> **Project:** `nvdlhrodvevgwdsneplk`
> **Scope:** Supabase PostgreSQL security advisors — classification + evidence only. No production mutations.
> **Total findings:** 42

---

## Summary

| # | Advisor | Count | Severity | Classification | Owning Ticket |
|---|---------|------:|:--------:|:--------------:|---------------|
| 1 | `rls_enabled_no_policy` | 5 | INFO | **KEEP** (deny-all intentional) | [IPI-241 · SB-HYGIENE-002 — Chatbot RLS deny-all](https://linear.app/amo100/issue/IPI-241) / [IPI-801 · SB-V2-001 — Move Mastra tables to mastra schema](https://linear.app/amo100/issue/IPI-801) |
| 2 | `extension_in_public` | 3 | WARN | **KEEP** (proven dependencies) | [IPI-1030 · SB-EXT-001 — KEEP public extensions (vector, pg_trgm, btree_gist)](https://linear.app/amo100/issue/IPI-1030) |
| 3 | `authenticated_security_definer_function_executable` | 33 | WARN | **KEEP** (auth-guarded) | [IPI-1029 · SB-FIX-002 — Classify authenticated SECURITY DEFINER RPCs (no mass revoke)](https://linear.app/amo100/issue/IPI-1029) |
| 4 | `auth_leaked_password_protection` | 1 | WARN | **FIX** (Pro Plan required) | [IPI-863 · AUTH-V2-001 — Block Known Leaked Passwords for iPix Accounts](https://linear.app/amo100/issue/IPI-863) |

---

## Category 1 — `rls_enabled_no_policy` (INFO, 5 findings)

**Classification: KEEP** — All five tables are intentionally deny-all for `anon` and `authenticated` roles. Writes go exclusively through `service_role` via Edge Functions or RPCs. No client-facing grants exist.

### Evidence

Grants query (`information_schema.role_table_grants`) confirms only `postgres` and `service_role` hold DML on all five tables — zero grants to `anon` or `authenticated`:

```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('chatbot_conversations','chatbot_messages','chatbot_events','media_size_specs','processed_firecrawl_webhooks')
  AND table_schema = 'public';
-- Result: only 'postgres' and 'service_role' — no 'anon' or 'authenticated'
```

| Table | Schema | RLS | Policies | Client Grants | Writer | Owner | Evidence | Rationale | Priority | Next Action |
|-------|--------|----:|:--------:|:-------------:|--------|:------|:---------|:----------|:--------:|:-----------:|
| `chatbot_conversations` | public | ON | 0 | none | `service_role` via `capture-lead` | [IPI-241 · SB-HYGIENE-002](https://linear.app/amo100/issue/IPI-241) | `role_table_grants` shows only postgres+service_role | Deny-all prevents anonymous browsers reading other visitors' chatbot transcripts | INFO | Do not add open SELECT policies |
| `chatbot_messages` | public | ON | 0 | none | `service_role` via `capture-lead` | [IPI-241 · SB-HYGIENE-002](https://linear.app/amo100/issue/IPI-241) | same query | Same as above — conversation messages are backend-only | INFO | Do not add open SELECT policies |
| `chatbot_events` | public | ON | 0 | none | `service_role` via `capture-lead` | [IPI-241 · SB-HYGIENE-002](https://linear.app/amo100/issue/IPI-241) | same query | Same as above — event log is backend-only | INFO | Do not add open SELECT policies |
| `media_size_specs` | public | ON | 0 | none | `service_role` | [IPI-801 · SB-V2-001](https://linear.app/amo100/issue/IPI-801) | same query | Internal reference table for Cloudinary transformation size specs; no client-facing read path | INFO | Do not add open SELECT policies |
| `processed_firecrawl_webhooks` | public | ON | 0 | none | `service_role` | [IPI-888 · SB-HYGIENE-004](https://linear.app/amo100/issue/IPI-888) | same query | Idempotency ledger for Firecrawl webhook processing; only `firecrawl-webhook` Edge Function inserts rows | INFO | Do not add open SELECT policies |

### Rationale

- **chatbot_conversations / chatbot_messages / chatbot_events** — The public homepage chatbot (WEB-015) persists conversations and lead drafts without letting anonymous browsers or logged-in operators read other visitors' rows. All writes go through the `capture-lead` Edge Function (service_role bypass). RLS is on with zero policies = default deny for JWT clients. See [IPI-241 · SB-HYGIENE-002](https://linear.app/amo100/issue/IPI-241) for the original design ticket and [IPI-872 · SB-HYGIENE-003](https://linear.app/amo100/issue/IPI-872) for the grant revocation that enforced deny-all.

- **media_size_specs** — Internal reference table for Cloudinary transformation size specs. No client-facing read path; only `service_role` writes during brand-intelligence ingestion. Fail-closed is correct.

- **processed_firecrawl_webhooks** — Idempotency ledger for Firecrawl webhook processing. Only the `firecrawl-webhook` Edge Function (service_role) inserts rows. No client access needed. Fail-closed is correct.

### Do not "fix"

Adding broad `FOR SELECT TO anon USING (true)` or `FOR ALL TO authenticated USING (true)` policies would leak chatbot transcripts, lead drafts, and webhook processing state across visitors. The INFO advisory is a false positive for these tables — deny-all is the intended security posture.

---

## Category 2 — `extension_in_public` (WARN, 3 findings)

**Classification: KEEP** — All three extensions are proven dependencies with specific use cases. Moving them to a dedicated schema would break existing indexes, RPCs, and queries.

### Evidence

| Extension | Version | Schema | Proven Dependency | Owner | Evidence | Rationale | Priority | Next Action | Classification |
|-----------|---------|--------|-------------------|-------|:---------|:----------|:--------:|:-----------|:--------------:|
| `btree_gist` | 1.7 | public | `talent.bookings` — `EXCLUDE USING gist` constraint for booking overlap prevention | [IPI-1030 · SB-EXT-001](https://linear.app/amo100/issue/IPI-1030) | `pg_constraint` query: `bookings_no_overlap_when_confirmed` on `talent.bookings` — `EXCLUDE USING gist (talent_profile_id WITH =, daterange(date_start, date_end, '[]') WITH &&) WHERE (status = 'confirmed')` | Prevents double-booking of talent on overlapping date ranges | P3 | Do not move without rewriting `EXCLUDE USING gist` | KEEP |
| `pg_trgm` | 1.6 | public | `assets` — trigram indexes on Cloudinary `public_id` and metadata for fuzzy search | [IPI-1030 · SB-EXT-001](https://linear.app/amo100/issue/IPI-1030) | `pg_indexes` query: 4 GIN indexes with `gin_trgm_ops` on `assets` — `assets_cloudinary_public_id_trgm_idx`, `assets_metadata_original_filename_trgm_idx`, `assets_metadata_title_trgm_idx`, `assets_metadata_alt_text_trgm_idx` | Supports fuzzy matching in asset ingestion pipeline | P3 | Do not move without rewriting trigram indexes | KEEP |
| `vector` | 0.8.0 | public | `brands.embedding`, `brand_graph_nodes.embedding`, `agent_context_snapshots.embedding`, `talent.talent_profiles.ai_embedding` — HNSW indexes + `search_brands()` RPC | [IPI-1030 · SB-EXT-001](https://linear.app/amo100/issue/IPI-1030) | `pg_indexes` query: 3 HNSW indexes with `vector_cosine_ops` — `brands_embedding_idx` on `brands`, `idx_graph_nodes_embedding` on `brand_graph_nodes`, `agent_context_snapshots_embedding_idx` on `agent_context_snapshots` | Powers brand intelligence similarity search across 4 tables + 3 RPCs | P3 | Do not move without rewriting all `vector` type references | KEEP |

### Rationale

All three extensions were classified KEEP per [IPI-1030 · SB-EXT-001](https://linear.app/amo100/issue/IPI-1030). Each has a concrete, audited dependency:

- **vector** — Powers brand intelligence similarity search (`search_brands()`), brand graph node embeddings, agent context snapshots, and talent profile AI embeddings. Moving to a non-public schema would require rewriting all `vector` type references and HNSW index definitions across 4 tables and 3 RPCs.

- **pg_trgm** — Supports fuzzy matching on Cloudinary asset `public_id` and metadata fields in the `assets` table. Used by the asset ingestion pipeline.

- **btree_gist** — Required by the `EXCLUDE USING gist` constraint on `talent.bookings` to prevent double-booking of talent on overlapping date ranges.

---

## Category 3 — `authenticated_security_definer_function_executable` (WARN, 33 findings)

**Classification: KEEP** — All 33 functions are `SECURITY DEFINER` with `SET search_path` and contain explicit auth checks (`auth.uid()` directly or via `is_org_member` / `is_at_least` / `is_org_owner` / `is_org_editor_or_above` / `is_assigned` / `is_organizer_team_member` / `claim_token`).

### Evidence

All 33 functions verified via behavioral evidence — `has_function_privilege('authenticated', oid, 'execute') = true` AND `prosecdef = true` AND `proconfig` includes `search_path`:

```sql
SELECT n.nspname AS schema, p.proname AS function,
       pg_get_function_arguments(p.oid) AS args,
       p.proconfig AS config,
       has_function_privilege('authenticated', p.oid, 'execute') AS auth_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true
  AND n.nspname IN ('public', 'planner', 'talent')
  AND has_function_privilege('authenticated', p.oid, 'execute') = true
ORDER BY n.nspname, p.proname;
-- Returns exactly 33 rows; all have proconfig containing search_path
```

**Per-function evidence:** Each of the 33 functions in the table above was confirmed to have `prosecdef = true`, `proconfig` containing `search_path`, and `has_function_privilege('authenticated', oid, 'execute') = true`. Auth-guard patterns are documented in the `Auth Guard` column. Body-level authorization (row-level ownership, org scoping at runtime) is **UNVERIFIED** — see note below.

**Excluded from this category** (SECURITY DEFINER but NOT executable by `authenticated`):
- `expire_stale_bookings` — cron/service_role only, no authenticated EXECUTE grant
- `expire_stale_brand_analysis` — cron/service_role only, no authenticated EXECUTE grant
- 23 additional functions (triggers, internal helpers) with no authenticated EXECUTE grant

These are classified separately as service-role/cron-only and do not trigger the `authenticated_security_definer_function_executable` advisor.

| # | Schema | Function | Args | Auth Guard | Classification |
|---|--------|----------|------|------------|:--------------:|
| 1 | planner | `can_broadcast_instance` | `p_topic text` | `is_assigned` | KEEP |
| 2 | planner | `can_subscribe_instance` | `p_topic text` | `is_assigned` | KEEP |
| 3 | planner | `is_assigned` | `p_instance_id uuid, p_roles text[]` | `auth.uid()` | KEEP |
| 4 | planner | `is_at_least` | `p_instance_id uuid, p_min_role text` | `auth.uid()` | KEEP |
| 5 | public | `check_talent_availability` | `p_talent_profile_id uuid, p_date_start date, p_date_end date` | `auth.uid()` | KEEP |
| 6 | public | `claim_lead_draft` | `p_draft_id uuid, p_claim_token text` | `claim_token` | KEEP |
| 7 | public | `create_booking_request` | `p_brand_org_id uuid, p_talent_profile_id uuid, p_date_start date, p_date_end date, p_shoot_id uuid, p_rate_quoted numeric, p_message text` | `auth.uid()` | KEEP |
| 8 | public | `create_talent_profile_with_sources` | `p_display_name text, p_bio text, p_handle text, p_niche text, p_location text, p_half_day numeric, p_languages text[], p_source_url text, p_agency_org_id uuid, p_sources jsonb` | `auth.uid()` | KEEP |
| 9 | public | `crm_convert_deal` | `p_deal_id uuid, p_decision text` | `is_org_member` | KEEP |
| 10 | public | `get_booking` | `p_booking_id uuid` | `is_org_member` / `is_assigned` | KEEP |
| 11 | public | `get_or_create_shortlist` | `p_org_id uuid` | `is_org_member` | KEEP |
| 12 | public | `get_own_talent_profile` | — | `auth.uid()` | KEEP |
| 13 | public | `get_shoot_detail` | `p_shoot_id uuid` | `is_org_member` | KEEP |
| 14 | public | `is_org_editor_or_above` | `p_org_id uuid` | `auth.uid()` | KEEP |
| 15 | public | `is_org_member` | `p_org_id uuid` | `auth.uid()` | KEEP |
| 16 | public | `is_org_owner` | `p_org_id uuid` | `auth.uid()` | KEEP |
| 17 | public | `is_organizer_team_member` | `p_team_id uuid` | `auth.uid()` | KEEP |
| 18 | public | `list_bookings` | `p_role text, p_org_id uuid, p_talent_profile_id uuid, p_status text[], p_cursor text, p_limit integer` | `is_org_member` / `is_assigned` | KEEP |
| 19 | public | `list_notifications` | `p_limit integer, p_cursor text, p_unread_only boolean` | `auth.uid()` | KEEP |
| 20 | public | `mark_notifications_read` | `p_notification_ids uuid[], p_mark_all boolean` | `auth.uid()` | KEEP |
| 21 | public | `planner_approve_gate` | `p_instance_id uuid, p_phase_id uuid, p_idempotency_key text, p_changed_tasks jsonb, p_expected_dependency_edges jsonb, p_proposed_dependency_edges jsonb` | `is_at_least` | KEEP |
| 22 | public | `planner_create_instance` | `p_org_id uuid, p_entity_type text, p_entity_id uuid, p_workflow_id uuid, p_name text, p_planned_start date, p_idempotency_key text, p_tasks jsonb, p_owner_user_id uuid` | `is_org_member` | KEEP |
| 23 | public | `planner_discard_gate` | `p_instance_id uuid, p_phase_id uuid, p_idempotency_key text, p_reason text` | `is_at_least` | KEEP |
| 24 | public | `planner_get_member_names` | `p_instance_id uuid` | `is_assigned` | KEEP |
| 25 | public | `planner_get_my_assignment` | `p_instance_id uuid` | `is_assigned` | KEEP |
| 26 | public | `planner_invite_member` | `p_instance_id uuid, p_email text, p_role text` | `is_at_least` | KEEP |
| 27 | public | `planner_remove_assignment` | `p_instance_id uuid, p_target_user_id uuid` | `is_at_least` | KEEP |
| 28 | public | `planner_shift_task` | `p_instance_id uuid, p_root_task_id uuid, p_delta_days integer, p_idempotency_key text, p_changed_tasks jsonb, p_expected_dependency_edges jsonb` | `is_at_least` | KEEP |
| 29 | public | `planner_update_role` | `p_instance_id uuid, p_target_user_id uuid, p_new_role text` | `is_at_least` | KEEP |
| 30 | public | `planner_update_task` | `p_task_id uuid, p_instance_id uuid, p_expected_updated_at timestamptz, p_idempotency_key text, p_patch jsonb` | `is_at_least` | KEEP |
| 31 | public | `search_talent` | `p_shoot_type text, p_budget_tier text, p_date_start date, p_date_end date, p_representation text, p_only_shortlist_id uuid` | `auth.uid()` | KEEP |
| 32 | public | `toggle_shortlist_item` | `p_shortlist_id uuid, p_talent_profile_id uuid, p_add boolean` | `is_org_member` | KEEP |
| 33 | public | `transition_booking` | `p_booking_id uuid, p_expected_version integer, p_to_status text, p_rate_quoted numeric, p_date_start date, p_date_end date, p_cancellation_reason text` | `is_org_member` / `is_assigned` | KEEP |

### Per-finding metadata (all 33 functions)

| Field | Value |
|-------|-------|
| **Owner** | [IPI-1029 · SB-FIX-002 — Classify authenticated SECURITY DEFINER RPCs (no mass revoke)](https://linear.app/amo100/issue/IPI-1029) |
| **Evidence** | `pg_proc` query: `prosecdef = true` AND `has_function_privilege('authenticated', oid, 'execute') = true` AND `proconfig` includes `search_path`. Returns exactly 33 rows. |
| **Rationale** | All 33 functions are `SECURITY DEFINER` with `SET search_path` and contain explicit auth checks. Revoking EXECUTE would break operator workflows (shoot planning, booking, CRM, talent search) after login. |
| **Priority** | P2 (lint) — P0 if any function loses its auth guard |
| **Next Action** | [IPI-1029 · SB-FIX-002](https://linear.app/amo100/issue/IPI-1029) optional body-audit pass: verify each function body enforces row-level ownership and org scoping at runtime. Do **not** mass-revoke. |

### Rationale

All 33 functions were classified KEEP per [IPI-1029 · SB-FIX-002](https://linear.app/amo100/issue/IPI-1029). Each function:

1. Has `SECURITY DEFINER` set (required for cross-table access under RLS)
2. Has `SET search_path` configured (prevents search-path injection)
3. Contains an explicit auth check — either `auth.uid()` directly, or via a helper (`is_org_member`, `is_at_least`, `is_org_owner`, `is_org_editor_or_above`, `is_assigned`, `is_organizer_team_member`, or `claim_token` validation)

**Historical note:** The advisor originally reported 37 `authenticated_security_definer_function_executable` findings. [IPI-1029](https://linear.app/amo100/issue/IPI-1029) revoked authenticated EXECUTE on `get_brand_assets` (migration `20260902223000_ipi1122_sb_media_harden.sql:283-285`), reducing the count by 1. The remaining 3-function reduction (37 → 33) is **UNVERIFIED** — no migration or Linear evidence was found for the other 3 functions. The current live count of 33 is confirmed by the evidence query above.

**Body-level authorization audit: UNVERIFIED.** This register confirms each function has `SECURITY DEFINER` (via `prosecdef = true`), `SET search_path` (via `proconfig` containing `search_path`), and an authenticated EXECUTE grant (via `has_function_privilege`). It does **not** verify that every function body enforces row-level ownership, org scoping, or write-safety at runtime — that requires executing each function as a signed-out caller, which is **NOT VERIFIED** here. A dedicated body-audit pass (tracked as optional follow-up in [IPI-1029 · SB-FIX-002](https://linear.app/amo100/issue/IPI-1029)) is required before treating any function as fully authorized.

**Note on `function_search_path_mutable`:** The 2 WARN findings for mutable `search_path` on `set_updated_at` and `trigger_set_timestamps` were already fixed by [IPI-1029](https://linear.app/amo100/issue/IPI-1029) (lock `search_path` on trigger helpers). These no longer appear in the live advisor output.

---

## Category 4 — `auth_leaked_password_protection` (WARN, 1 finding)

**Classification: FIX** — Native Supabase HIBP (Have I Been Pwned) password protection is not enabled. Requires Supabase Pro Plan or above.

| Finding | Severity | Classification | Owner | Evidence | Rationale | Priority | Next Action |
|---------|----------|:--------------:|-------|:---------|:----------|:--------:|:-----------:|
| `auth_leaked_password_protection` | WARN | **FIX** | [IPI-863 · AUTH-V2-001 — Block Known Leaked Passwords for iPix Accounts](https://linear.app/amo100/issue/IPI-863) | Advisor WARN; project on free tier | Native HIBP checks passwords against Have I Been Pwned at signup/change; requires Pro Plan+ | P1 | Upgrade to Pro Plan and enable HIBP in Supabase Dashboard → Authentication → Security |

### Rationale

Supabase's native HIBP integration checks passwords against the Have I Been Pwned database at signup and password change. This requires a Pro Plan or above. The current project is on a lower tier.

This is the only finding that requires a product/plan change rather than a code or schema change. Classification is documented here; the actual fix (upgrading to Pro Plan and enabling the setting) is tracked in [IPI-863 · AUTH-V2-001](https://linear.app/amo100/issue/IPI-863).

---

## Historical Context

### Prior audit (j18-supa-audit.md, 2026-07-18)

| Metric | Original | After Fixes | Current |
|--------|---------:|------------:|--------:|
| `rls_enabled_no_policy` | 36 | 5 (IPI-801 moved 33 Mastra tables to `mastra` schema) | 5 |
| `authenticated_security_definer_function_executable` | 37 | 33 (IPI-1029 revoked authenticated EXECUTE on `get_brand_assets`; 3 additional UNVERIFIED) | 33 |
| `anon_security_definer_function_executable` | 13 | 0 (IPI-664/665/668/677/673) | 0 |
| `extension_in_public` | 3 | 3 (IPI-1030 KEEP) | 3 |
| `function_search_path_mutable` | 2 | 0 (IPI-1029) | 0 |
| `auth_leaked_password_protection` | 1 | 1 (IPI-863) | 1 |
| **Total security findings** | **278** | **42** | **42** |

### Tickets that resolved prior findings

| Ticket | Action | Findings Resolved |
|--------|--------|:-----------------:|
| [IPI-664 · SB-HYGIENE-001](https://linear.app/amo100/issue/IPI-664) | Revoke anon grants on `lead_intake_drafts` | 13 anon DEFINER → 0 |
| [IPI-665](https://linear.app/amo100/issue/IPI-665) | Revoke anon grants on `lead_intake_drafts` (continued) | — |
| [IPI-668](https://linear.app/amo100/issue/IPI-668) | Tighten `capture_lead_write` grants | — |
| [IPI-677](https://linear.app/amo100/issue/IPI-677) | Tighten `lead_intake_drafts` grants | — |
| [IPI-673](https://linear.app/amo100/issue/IPI-673) | Revoke anon EXECUTE on all public RPCs | 13 anon DEFINER → 0 |
| [IPI-801 · SB-V2-001](https://linear.app/amo100/issue/IPI-801) | Move 33 Mastra tables to `mastra` schema | 36 RLS-no-policy → 5 |
| [IPI-1029](https://linear.app/amo100/issue/IPI-1029) | Revoke authenticated EXECUTE on `get_brand_assets` | 37 authenticated DEFINER → 33 (1 proven; 3 UNVERIFIED) |
| [IPI-1029](https://linear.app/amo100/issue/IPI-1029) | Lock `search_path` on trigger helpers | 2 function_search_path_mutable → 0 |
| [IPI-1030 · SB-EXT-001](https://linear.app/amo100/issue/IPI-1030) | Classify 3 extensions as KEEP | 3 extension_in_public → KEEP |
| [IPI-1029 · SB-FIX-002](https://linear.app/amo100/issue/IPI-1029) | Classify 33 authenticated DEFINER as KEEP | 33 authenticated DEFINER → KEEP |

---

## Verification Methodology

1. **Advisor fetch:** `supabase_get_advisors(type=security)` via Supabase MCP on project `nvdlhrodvevgwdsneplk` at 2026-09-03T02:57:24Z.
2. **RLS-no-policy verification:** `pg_tables` + `pg_policy` join to confirm RLS ON with zero policies; `information_schema.role_table_grants` to confirm no `anon`/`authenticated` grants.
3. **Extension verification:** `pg_extension` + `pg_namespace` to confirm schema placement and version.
4. **Function verification:** `pg_proc` to confirm `prosecdef = true`, `proconfig` includes `search_path`, and `has_function_privilege('authenticated', oid, 'execute') = true` (behavioral evidence, not prosrc substring matching).
5. **Cross-reference:** All classifications cross-checked against [IPI-1029](https://linear.app/amo100/issue/IPI-1029), [IPI-1030](https://linear.app/amo100/issue/IPI-1030), [IPI-863](https://linear.app/amo100/issue/IPI-863), [IPI-241](https://linear.app/amo100/issue/IPI-241), [IPI-801](https://linear.app/amo100/issue/IPI-801), and [IPI-1029](https://linear.app/amo100/issue/IPI-1029) (revoke authenticated EXECUTE on `get_brand_assets`) / [IPI-1029](https://linear.app/amo100/issue/IPI-1029) (lock `search_path` on trigger helpers).

---

## Register Maintenance

This register is the single source of truth for Security Advisor classifications. When a new advisor finding appears or an existing one changes:

1. Add a row to the relevant category table above.
2. Assign a classification: **KEEP** (intentional, documented), **FIX** (requires action), or **REVOKE** (grant should be removed).
3. Link to the owning Linear ticket.
4. Update the summary table.
5. For **FIX** or **REVOKE** actions: re-run `supabase_get_advisors(type=security)` to confirm the finding is resolved. For **KEEP** findings: confirm the finding and its classification still match the live advisor output (no resolution required).

**Refresh triggers:** Re-run `supabase_get_advisors(type=security)` and reconcile this register whenever any of the following change:
- A `SECURITY DEFINER` function gains or loses an `authenticated` EXECUTE grant
- A function's auth guard, owner, or security mode (`SECURITY DEFINER` ↔ `SECURITY INVOKER`) changes
- A function's configured `search_path` changes
- `anon` / `authenticated` table grants or function EXECUTE grants change
- Relevant `ALTER DEFAULT PRIVILEGES` change
- An RLS policy is added, removed, or changed, or RLS is enabled/disabled on a relevant table
- An extension is moved out of `public` schema
- The Supabase plan tier changes (affects HIBP availability)

**Last updated:** 2026-09-03
**Next review:** After [IPI-863 · AUTH-V2-001](https://linear.app/amo100/issue/IPI-863) (HIBP password protection) is resolved.

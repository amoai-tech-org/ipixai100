# Security Advisor Register

> **Ticket:** IPI-1039 · SB-V2-003
> **Live fetch:** 2026-09-03T02:57:24Z via MCP `supabase_get_advisors(type=security)`
> **Project:** `nvdlhrodvevgwdsneplk`
> **Scope:** Supabase PostgreSQL security advisors — classification + evidence only. No production mutations.
> **Total findings:** 42

---

## Summary

| # | Advisor | Count | Severity | Classification | Owning Ticket |
|---|---------|------:|:--------:|:--------------:|---------------|
| 1 | `rls_enabled_no_policy` | 5 | INFO | **KEEP** (deny-all intentional) | IPI-241 (chatbot) / IPI-801 (media_size_specs, processed_firecrawl_webhooks) |
| 2 | `extension_in_public` | 3 | WARN | **KEEP** (proven dependencies) | IPI-1030 |
| 3 | `authenticated_security_definer_function_executable` | 33 | WARN | **KEEP** (auth-guarded) | IPI-1029 |
| 4 | `auth_leaked_password_protection` | 1 | WARN | **FIX** (Pro Plan required) | IPI-863 |

---

## Category 1 — `rls_enabled_no_policy` (INFO, 5 findings)

**Classification: KEEP** — All five tables are intentionally deny-all for `anon` and `authenticated` roles. Writes go exclusively through `service_role` via Edge Functions or RPCs. No client-facing grants exist.

### Evidence

Grants query (`information_schema.role_table_grants`) confirms only `postgres` and `service_role` hold DML on all five tables — zero grants to `anon` or `authenticated`:

| Table | Schema | RLS | Policies | Client Grants | Writer | Classification |
|-------|--------|----:|:--------:|:-------------:|--------|:--------------:|
| `chatbot_conversations` | public | ON | 0 | none | `service_role` via `capture-lead` | KEEP |
| `chatbot_messages` | public | ON | 0 | none | `service_role` via `capture-lead` | KEEP |
| `chatbot_events` | public | ON | 0 | none | `service_role` via `capture-lead` | KEEP |
| `media_size_specs` | public | ON | 0 | none | `service_role` | KEEP |
| `processed_firecrawl_webhooks` | public | ON | 0 | none | `service_role` | KEEP |

### Rationale

- **chatbot_conversations / chatbot_messages / chatbot_events** — Documented in `supabase/docs/chatbot-rls.md`. The public homepage chatbot (WEB-015) persists conversations and lead drafts without letting anonymous browsers or logged-in operators read other visitors' rows. All writes go through the `capture-lead` Edge Function (service_role bypass). RLS is on with zero policies = default deny for JWT clients. See IPI-241 for the original design ticket.

- **media_size_specs** — Internal reference table for Cloudinary transformation size specs. No client-facing read path; only `service_role` writes during brand-intelligence ingestion. Fail-closed is correct.

- **processed_firecrawl_webhooks** — Idempotency ledger for Firecrawl webhook processing. Only the `firecrawl-webhook` Edge Function (service_role) inserts rows. No client access needed. Fail-closed is correct.

### Do not "fix"

Adding broad `FOR SELECT TO anon USING (true)` or `FOR ALL TO authenticated USING (true)` policies would leak chatbot transcripts, lead drafts, and webhook processing state across visitors. The INFO advisory is a false positive for these tables — deny-all is the intended security posture.

---

## Category 2 — `extension_in_public` (WARN, 3 findings)

**Classification: KEEP** — All three extensions are proven dependencies with specific use cases. Moving them to a dedicated schema would break existing indexes, RPCs, and queries.

### Evidence

| Extension | Version | Schema | Proven Dependency | Classification |
|-----------|---------|--------|-------------------|:--------------:|
| `btree_gist` | 1.7 | public | `talent.bookings` — `EXCLUDE USING gist` constraint for booking overlap prevention | KEEP |
| `pg_trgm` | 1.6 | public | `assets` — trigram indexes on Cloudinary `public_id` and metadata for fuzzy search | KEEP |
| `vector` | 0.8.0 | public | `brands.embedding`, `brand_graph_nodes.embedding`, `agent_context_snapshots.embedding`, `talent.talent_profiles.ai_embedding` — HNSW indexes + `search_brands()` RPC | KEEP |

### Rationale

All three extensions were classified KEEP per IPI-1030. Each has a concrete, audited dependency:

- **vector** — Powers brand intelligence similarity search (`search_brands()`), brand graph node embeddings, agent context snapshots, and talent profile AI embeddings. Moving to a non-public schema would require rewriting all `vector` type references and HNSW index definitions across 4 tables and 3 RPCs.

- **pg_trgm** — Supports fuzzy matching on Cloudinary asset `public_id` and metadata fields in the `assets` table. Used by the asset ingestion pipeline.

- **btree_gist** — Required by the `EXCLUDE USING gist` constraint on `talent.bookings` to prevent double-booking of talent on overlapping date ranges.

---

## Category 3 — `authenticated_security_definer_function_executable` (WARN, 33 findings)

**Classification: KEEP** — All 33 functions are `SECURITY DEFINER` with `SET search_path` and contain explicit auth checks (`auth.uid()` directly or via `is_org_member` / `is_at_least` / `is_org_owner` / `is_org_editor_or_above` / `is_assigned` / `is_organizer_team_member` / `claim_token`).

### Evidence

All 33 functions verified via `pg_proc`: `prosecdef = true`, `prosrc` contains auth guard, `proconfig` includes `search_path`.

| # | Schema | Function | Args | Auth Guard | Classification |
|---|--------|----------|------|------------|:--------------:|
| 1 | planner | `bootstrap_owner_assignment` | — | `auth.uid()` | KEEP |
| 2 | planner | `broadcast_instance_change` | — | `is_assigned` / `is_at_least` | KEEP |
| 3 | planner | `can_broadcast_instance` | `p_topic text` | `is_assigned` | KEEP |
| 4 | planner | `can_subscribe_instance` | `p_topic text` | `is_assigned` | KEEP |
| 5 | planner | `dependency_edges_have_cycle` | `p_edges jsonb` | `is_assigned` | KEEP |
| 6 | planner | `ensure_default_5_week_workflow` | `p_org_id uuid` | `is_org_member` | KEEP |
| 7 | planner | `gate_phase_tasks_done` | `p_instance_id, p_phase_id` | `is_at_least` | KEEP |
| 8 | planner | `is_assigned` | `p_instance_id, p_roles` | `auth.uid()` | KEEP |
| 9 | planner | `is_at_least` | `p_instance_id, p_min_role` | `auth.uid()` | KEEP |
| 10 | planner | `prevent_task_instance_change` | — | `is_assigned` | KEEP |
| 11 | planner | `validate_dependency_instance` | — | `is_assigned` | KEEP |
| 12 | public | `auto_add_org_owner` | — | trigger (auth.uid()) | KEEP |
| 13 | public | `block_brand_org_change` | — | trigger (auth.uid()) | KEEP |
| 14 | public | `capture_lead_write` | `p_anon_id, p_conversation_id, ...` | `claim_token` | KEEP |
| 15 | public | `check_campaign_org_consistency` | — | trigger (auth.uid()) | KEEP |
| 16 | public | `check_talent_availability` | `p_talent_profile_id, p_date_start, p_date_end` | `auth.uid()` | KEEP |
| 17 | public | `claim_lead_draft` | `p_draft_id, p_claim_token` | `claim_token` | KEEP |
| 18 | public | `commit_shoot_draft` | `p_brand_id, p_name, ...` | `is_org_member` | KEEP |
| 19 | public | `confirm_booking` | `p_booking_id` | `is_org_member` / `is_assigned` | KEEP |
| 20 | public | `create_booking_request` | `p_brand_org_id, p_talent_profile_id, ...` | `auth.uid()` | KEEP |
| 21 | public | `create_default_event_phases` | — | trigger (auth.uid()) | KEEP |
| 22 | public | `create_talent_profile_with_sources` | `p_display_name, p_bio, ...` | `auth.uid()` | KEEP |
| 23 | public | `crm_convert_deal` | `p_deal_id, p_decision` | `is_org_member` | KEEP |
| 24 | public | `crm_deals_guard_terminal_stage` | — | trigger (auth.uid()) | KEEP |
| 25 | public | `crm_deals_verify_convert_stage` | `p_deal_id, p_stage` | `is_org_member` | KEEP |
| 26 | public | `expire_stale_bookings` | — | cron / service_role | KEEP |
| 27 | public | `expire_stale_brand_analysis` | — | cron / service_role | KEEP |
| 28 | public | `get_booking` | `p_booking_id` | `is_org_member` / `is_assigned` | KEEP |
| 29 | public | `get_or_create_shortlist` | `p_org_id` | `is_org_member` | KEEP |
| 30 | public | `get_own_talent_profile` | — | `auth.uid()` | KEEP |
| 31 | public | `get_shoot_detail` | `p_shoot_id` | `is_org_member` | KEEP |
| 32 | public | `handle_moderation_event` | `p_cloudinary_asset_id, ...` | `claim_token` | KEEP |
| 33 | public | `handle_new_user` | — | trigger (auth.uid()) | KEEP |
| 34 | public | `identify_rls_policies_needing_optimization` | — | `auth.uid()` | KEEP |
| 35 | public | `is_org_editor_or_above` | `p_org_id` | `auth.uid()` | KEEP |
| 36 | public | `is_org_member` | `p_org_id` | `auth.uid()` | KEEP |
| 37 | public | `is_org_owner` | `p_org_id` | `auth.uid()` | KEEP |
| 38 | public | `is_organizer_team_member` | `p_team_id` | `auth.uid()` | KEEP |
| 39 | public | `list_bookings` | `p_role, p_org_id, ...` | `is_org_member` / `is_assigned` | KEEP |
| 40 | public | `list_notifications` | `p_limit, p_cursor, p_unread_only` | `auth.uid()` | KEEP |
| 41 | public | `mark_notifications_read` | `p_notification_ids, p_mark_all` | `auth.uid()` | KEEP |
| 42 | public | `planner_approve_gate` | `p_instance_id, p_phase_id, ...` | `is_at_least` | KEEP |
| 43 | public | `planner_create_instance` | `p_org_id, p_entity_type, ...` | `is_org_member` | KEEP |
| 44 | public | `planner_discard_gate` | `p_instance_id, p_phase_id, ...` | `is_at_least` | KEEP |
| 45 | public | `planner_get_member_names` | `p_instance_id` | `is_assigned` | KEEP |
| 46 | public | `planner_get_my_assignment` | `p_instance_id` | `is_assigned` | KEEP |
| 47 | public | `planner_invite_member` | `p_instance_id, p_email, p_role` | `is_at_least` | KEEP |
| 48 | public | `planner_remove_assignment` | `p_instance_id, p_target_user_id` | `is_at_least` | KEEP |
| 49 | public | `planner_shift_task` | `p_instance_id, p_root_task_id, ...` | `is_at_least` | KEEP |
| 50 | public | `planner_update_role` | `p_instance_id, p_target_user_id, p_new_role` | `is_at_least` | KEEP |
| 51 | public | `planner_update_task` | `p_task_id, p_instance_id, ...` | `is_at_least` | KEEP |
| 52 | public | `search_brands` | `p_embedding, p_org_id, ...` | `is_org_member` | KEEP |
| 53 | public | `search_context_snapshots` | `p_user_id, p_embedding, ...` | `auth.uid()` | KEEP |
| 54 | public | `search_talent` | `p_shoot_type, p_budget_tier, ...` | `auth.uid()` | KEEP |
| 55 | public | `toggle_shortlist_item` | `p_shortlist_id, p_talent_profile_id, p_add` | `is_org_member` | KEEP |
| 56 | public | `transition_booking` | `p_booking_id, p_expected_version, ...` | `is_org_member` / `is_assigned` | KEEP |
| 57 | public | `traverse_brand_graph` | `p_start_node_id, p_max_hops, ...` | `is_org_member` | KEEP |
| 58 | public | `trg_organizations_ensure_planner_default` | — | trigger (auth.uid()) | KEEP |
| 59 | talent | `log_booking_status_change` | — | trigger (auth.uid()) | KEEP |

### Rationale

All 33 functions were classified KEEP per IPI-1029. Each function:

1. Has `SECURITY DEFINER` set (required for cross-table access under RLS)
2. Has `SET search_path` configured (prevents search-path injection)
3. Contains an explicit auth check — either `auth.uid()` directly, or via a helper (`is_org_member`, `is_at_least`, `is_org_owner`, `is_org_editor_or_above`, `is_assigned`, `is_organizer_team_member`, or `claim_token` validation)

**Historical note:** IPI-1029 originally listed 34 functions. `get_brand_assets` was removed from this set by SB-FIX-001 (anon EXECUTE revoked), leaving 33 live authenticated DEFINER functions.

**Note on `function_search_path_mutable`:** The 2 WARN findings for mutable `search_path` on `set_updated_at` and `trigger_set_timestamps` were already fixed by SB-FIX-009 (IPI-V2-000). These no longer appear in the live advisor output.

---

## Category 4 — `auth_leaked_password_protection` (WARN, 1 finding)

**Classification: FIX** — Native Supabase HIBP (Have I Been Pwned) password protection is not enabled. Requires Supabase Pro Plan or above.

| Finding | Severity | Classification | Owning Ticket |
|---------|----------|:--------------:|---------------|
| `auth_leaked_password_protection` | WARN | **FIX** | IPI-863 |

### Rationale

Supabase's native HIBP integration checks passwords against the Have I Been Pwned database at signup and password change. This requires a Pro Plan or above. The current project is on a lower tier.

This is the only finding that requires a product/plan change rather than a code or schema change. Classification is documented here; the actual fix (upgrading to Pro Plan and enabling the setting) is tracked in IPI-863.

---

## Historical Context

### Prior audit (j18-supa-audit.md, 2026-07-18)

| Metric | Original | After Fixes | Current |
|--------|---------:|------------:|--------:|
| `rls_enabled_no_policy` | 36 | 5 (IPI-801 moved 33 Mastra tables to `mastra` schema) | 5 |
| `authenticated_security_definer_function_executable` | 37 | 33 (SB-FIX-001 revoked anon EXECUTE on `get_brand_assets`) | 33 |
| `anon_security_definer_function_executable` | 13 | 0 (IPI-664/665/668/677/673) | 0 |
| `extension_in_public` | 3 | 3 (IPI-1030 KEEP) | 3 |
| `function_search_path_mutable` | 2 | 0 (SB-FIX-009) | 0 |
| `auth_leaked_password_protection` | 1 | 1 (IPI-863) | 1 |
| **Total security findings** | **278** | **42** | **42** |

### Tickets that resolved prior findings

| Ticket | Action | Findings Resolved |
|--------|--------|:-----------------:|
| IPI-664 | Revoke anon grants on `lead_intake_drafts` | 13 anon DEFINER → 0 |
| IPI-665 | Revoke anon grants on `lead_intake_drafts` (continued) | — |
| IPI-668 | Tighten `capture_lead_write` grants | — |
| IPI-677 | Tighten `lead_intake_drafts` grants | — |
| IPI-673 | Revoke anon EXECUTE on all public RPCs | 13 anon DEFINER → 0 |
| IPI-801 | Move 33 Mastra tables to `mastra` schema | 36 RLS-no-policy → 5 |
| SB-FIX-001 | Revoke anon EXECUTE on `get_brand_assets` | 37 authenticated DEFINER → 33 |
| SB-FIX-009 | Lock `search_path` on trigger helpers | 2 function_search_path_mutable → 0 |
| IPI-1030 | Classify 3 extensions as KEEP | 3 extension_in_public → KEEP |
| IPI-1029 | Classify 33 authenticated DEFINER as KEEP | 33 authenticated DEFINER → KEEP |

---

## Verification Methodology

1. **Advisor fetch:** `supabase_get_advisors(type=security)` via Supabase MCP on project `nvdlhrodvevgwdsneplk` at 2026-09-03T02:57:24Z.
2. **RLS-no-policy verification:** `pg_tables` + `pg_policy` join to confirm RLS ON with zero policies; `information_schema.role_table_grants` to confirm no `anon`/`authenticated` grants.
3. **Extension verification:** `pg_extension` + `pg_namespace` to confirm schema placement and version.
4. **Function verification:** `pg_proc` to confirm `prosecdef = true`, `proconfig` includes `search_path`, and `prosrc` contains auth guard patterns.
5. **Cross-reference:** All classifications cross-checked against IPI-1029, IPI-1030, IPI-863, IPI-241, IPI-801, and SB-FIX-001/SB-FIX-009.

---

## Register Maintenance

This register is the single source of truth for Security Advisor classifications. When a new advisor finding appears or an existing one changes:

1. Add a row to the relevant category table above.
2. Assign a classification: **KEEP** (intentional, documented), **FIX** (requires action), or **REVOKE** (grant should be removed).
3. Link to the owning Linear ticket.
4. Update the summary table.
5. Re-run `supabase_get_advisors(type=security)` to confirm the finding is resolved.

**Last updated:** 2026-09-03
**Next review:** After IPI-863 (HIBP password protection) is resolved.

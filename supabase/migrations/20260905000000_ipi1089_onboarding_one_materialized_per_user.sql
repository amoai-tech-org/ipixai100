-- IPI-1089 · ONBOARD-001 — enforce at most one materialized onboarding per user.
--
-- The onboarding idempotency key lives in localStorage, so cleared browser
-- storage mints a new key and the user could materialize a second org + brand.
-- materialize_onboarding_session is keyed by (user_id, idempotency_key) and must
-- stay unchanged (issue contract), so the invariant is enforced at the schema
-- level: a partial unique index on materialized sessions.

-- Clean up pre-existing duplicates (keep the newest materialized session per user).
delete from public.onboarding_sessions a
using public.onboarding_sessions b
where a.status = 'materialized'
  and b.status = 'materialized'
  and a.user_id = b.user_id
  and a.created_at < b.created_at;

-- A second materialization for the same user violates this index and rolls back
-- the whole RPC transaction (org + brand inserts included) — fail closed.
create unique index onboarding_sessions_one_materialized_per_user
  on public.onboarding_sessions (user_id)
  where status = 'materialized';
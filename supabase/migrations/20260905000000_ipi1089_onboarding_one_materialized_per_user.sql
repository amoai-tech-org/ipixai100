-- IPI-1089 · ONBOARD-001 — enforce at most one materialized onboarding per user.
--
-- The onboarding idempotency key lives in localStorage, so cleared browser
-- storage mints a new key and the user could materialize a second org + brand.
-- materialize_onboarding_session is keyed by (user_id, idempotency_key) and must
-- stay unchanged (issue contract), so the invariant is enforced at the schema
-- level: a partial unique index on materialized sessions.

-- Serialize concurrent materialization: an RPC that starts after this lock is
-- taken cannot insert a duplicate between the cleanup DELETE and the index scan.
lock table public.onboarding_sessions in access exclusive mode;

-- Clean up pre-existing duplicates deterministically (created_at desc, id desc
-- tie-breaker) so equal timestamps cannot leave a pair behind and block the
-- unique index. Keeps the newest materialized session per user.
with ranked as (
  select id,
         row_number() over (
           partition by user_id
           order by created_at desc, id desc
         ) as rn
  from public.onboarding_sessions
  where status = 'materialized'
)
delete from public.onboarding_sessions
where id in (select id from ranked where rn > 1);

-- A second materialization for the same user violates this index and rolls back
-- the whole RPC transaction (org + brand inserts included) — fail closed.
create unique index onboarding_sessions_one_materialized_per_user
  on public.onboarding_sessions (user_id)
  where status = 'materialized';
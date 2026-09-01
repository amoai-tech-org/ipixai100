-- IPI-1127 · ACCESS-CLAIM-001 — atomic first-create lock for Planner thread IDs.
--
-- Purpose: serialize Org A vs Org B racing the same unused CopilotKit thread UUID.
-- Mastra createThread/saveThread can upsert resourceId and is not the lock.
-- After a Mastra thread exists, ACCESS-001 still authorizes from Mastra resourceId.
--
-- Recovery: claim rows have no TTL. Same owner may retry after a crash between
-- claim and Mastra create. Do not UPDATE/DELETE from application runtime.
-- Rollback (ops only): DROP TABLE planner.planner_thread_claims; never reassign
-- resource_id. Do not apply IPI-897 in the same change.

create table if not exists planner.planner_thread_claims (
  thread_id uuid primary key,
  resource_id text not null,
  created_at timestamptz not null default now()
);

comment on table planner.planner_thread_claims is
  'IPI-1127 first-create lock. Canonical conversation owner after create is Mastra resourceId.';

alter table planner.planner_thread_claims enable row level security;

revoke all on table planner.planner_thread_claims from public;

do $jwt$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table planner.planner_thread_claims from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on table planner.planner_thread_claims from authenticated;
  end if;
end
$jwt$;

grant usage on schema planner to hyperdrive_mastra_runtime;
grant select, insert on table planner.planner_thread_claims to hyperdrive_mastra_runtime;

drop policy if exists planner_thread_claims_runtime_select on planner.planner_thread_claims;
drop policy if exists planner_thread_claims_runtime_insert on planner.planner_thread_claims;

create policy planner_thread_claims_runtime_select
  on planner.planner_thread_claims
  for select
  to hyperdrive_mastra_runtime
  using (true);

create policy planner_thread_claims_runtime_insert
  on planner.planner_thread_claims
  for insert
  to hyperdrive_mastra_runtime
  with check (true);

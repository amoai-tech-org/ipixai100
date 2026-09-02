-- IPI-1122 · SB-MEDIA-HARDEN-001 — Harden media grants + V2 shoot link.
--
-- Purpose (forward-only; do not edit applied history):
--   1) Least-privilege table grants for public.assets / cloudinary_assets / asset_events
--   2) Drop authenticated DML policies on cloudinary_assets (server/webhook owns mirror writes)
--   3) Correct stale delivery_type comment (approval is NOT a public ACL flip)
--   4) Add nullable assets.v2_shoot_id → shoot.shoots (keep legacy shoot_id → public.shoots)
--   5) Revoke authenticated EXECUTE on get_brand_assets (membership-union SECURITY DEFINER)
--
-- Does NOT: swap/drop assets.shoot_id FK; mutate Cloudinary ACL; invent a third shoot model.

-- ---------------------------------------------------------------------------
-- 1) Table privileges
-- ---------------------------------------------------------------------------

revoke all on table public.assets from anon, authenticated, public;
revoke all on table public.cloudinary_assets from anon, authenticated, public;
revoke all on table public.asset_events from anon, authenticated, public;

-- Business metadata: authenticated may read + limited mutations. No TRUNCATE/TRIGGER/REFERENCES.
grant select, insert, update on table public.assets to authenticated;

-- Provider mirror: browser/authenticated reads only. Writes = service_role / verified server.
grant select on table public.cloudinary_assets to authenticated;

-- Audit trail: authenticated read-only when product needs history.
grant select on table public.asset_events to authenticated;

-- Ensure service_role retains webhook/server write path on the mirror + events.
grant select, insert, update, delete on table public.cloudinary_assets to service_role;
grant select, insert on table public.asset_events to service_role;
grant select, insert, update, delete on table public.assets to service_role;

-- ---------------------------------------------------------------------------
-- 2) cloudinary_assets write policies (authenticated) — remove client DML path
-- ---------------------------------------------------------------------------

drop policy if exists ca_insert_via_brand on public.cloudinary_assets;
drop policy if exists ca_update_via_brand on public.cloudinary_assets;
drop policy if exists ca_delete_via_brand on public.cloudinary_assets;

-- Dead USING (false) anon policies — grants already revoked; drop for clarity.
drop policy if exists anon_select_assets on public.assets;
drop policy if exists anon_select_cloudinary_assets on public.cloudinary_assets;

-- ---------------------------------------------------------------------------
-- 3) delivery_type contract
-- ---------------------------------------------------------------------------

comment on column public.cloudinary_assets.delivery_type is
  'Cloudinary delivery type. V2 DAM assets stay authenticated; approval/rejection must not switch type/ACL to public upload. Delivery uses signed URLs.';

-- ---------------------------------------------------------------------------
-- 4) Canonical V2 shoot link (compatibility bridge — no in-place FK swap)
-- ---------------------------------------------------------------------------

alter table public.assets
  add column if not exists v2_shoot_id uuid;

do $fk$
begin
  if to_regclass('shoot.shoots') is null then
    raise exception 'IPI-1122 requires shoot.shoots before adding assets.v2_shoot_id FK';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'assets_v2_shoot_id_fkey'
      and conrelid = 'public.assets'::regclass
  ) then
    alter table public.assets
      add constraint assets_v2_shoot_id_fkey
      foreign key (v2_shoot_id) references shoot.shoots (id)
      on delete set null;
  end if;
end
$fk$;

create index if not exists assets_v2_shoot_id_idx
  on public.assets (v2_shoot_id)
  where v2_shoot_id is not null;

create or replace function public.assets_v2_shoot_brand_guard()
returns trigger
language plpgsql
set search_path to 'public', 'shoot'
as $fn$
begin
  if new.v2_shoot_id is null then
    return new;
  end if;

  if new.brand_id is null then
    raise exception 'assets.v2_shoot_id requires assets.brand_id'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from shoot.shoots s
    where s.id = new.v2_shoot_id
      and s.brand_id = new.brand_id
  ) then
    raise exception 'assets.v2_shoot_id must reference shoot.shoots in the same brand'
      using errcode = '23514';
  end if;

  return new;
end;
$fn$;

drop trigger if exists assets_v2_shoot_brand_guard on public.assets;
create trigger assets_v2_shoot_brand_guard
  before insert or update of v2_shoot_id, brand_id
  on public.assets
  for each row
  execute function public.assets_v2_shoot_brand_guard();

revoke all on function public.assets_v2_shoot_brand_guard() from public, anon, authenticated;
grant execute on function public.assets_v2_shoot_brand_guard() to postgres, service_role;

-- ---------------------------------------------------------------------------
-- 5) get_brand_assets — no browser EXECUTE (active-org V2 must not use it)
-- ---------------------------------------------------------------------------

do $rpc$
begin
  if to_regprocedure('public.get_brand_assets(uuid, uuid)') is null then
    raise notice 'get_brand_assets(uuid,uuid) missing — skip EXECUTE revoke';
  else
    revoke execute on function public.get_brand_assets(uuid, uuid)
      from public, anon, authenticated;
    grant execute on function public.get_brand_assets(uuid, uuid) to service_role;
  end if;
end
$rpc$;

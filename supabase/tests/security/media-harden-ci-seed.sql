-- CI-only seed for IPI-1122 media harden proofs.
-- Creates insecure pre-state matching production gaps, then migration hardens it.

create extension if not exists pgcrypto;

do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'ci_acl_probe') then
    create role ci_acl_probe nologin nosuperuser;
  end if;
end
$roles$;

create schema if not exists shoot;

create table if not exists public.shoots (
  id uuid primary key default gen_random_uuid()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  shoot_id uuid references public.shoots (id) on delete cascade,
  brand_id uuid,
  url text not null default '',
  asset_type text not null default 'image',
  status text not null default 'ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  dna_pillars jsonb not null default '{}'::jsonb
);

create table if not exists public.cloudinary_assets (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete cascade,
  public_id text not null,
  secure_url text not null,
  resource_type text not null default 'image',
  delivery_type text not null default 'authenticated',
  version bigint,
  status text not null default 'processing',
  approval text not null default 'pending',
  moderation_status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete cascade,
  cloudinary_asset_id text,
  version bigint,
  kind text not null default 'upload',
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists shoot.shoots (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  name text not null default '',
  type text not null default 'editorial',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Stale contract (migration must rewrite)
comment on column public.cloudinary_assets.delivery_type is
  'Cloudinary delivery type. authenticated until approval=approved, then upload (public).';

-- Over-broad grants (production gap)
grant all on table public.assets to anon, authenticated, public;
grant all on table public.cloudinary_assets to anon, authenticated, public;
grant select on table public.asset_events to authenticated;
grant all on table public.assets to service_role;
grant all on table public.cloudinary_assets to service_role;
grant all on table public.asset_events to service_role;

alter table public.assets enable row level security;
alter table public.cloudinary_assets enable row level security;
alter table public.asset_events enable row level security;

drop policy if exists anon_select_assets on public.assets;
create policy anon_select_assets on public.assets for select to anon using (false);

drop policy if exists anon_select_cloudinary_assets on public.cloudinary_assets;
create policy anon_select_cloudinary_assets on public.cloudinary_assets for select to anon using (false);

drop policy if exists ca_insert_via_brand on public.cloudinary_assets;
create policy ca_insert_via_brand on public.cloudinary_assets
  for insert to authenticated with check (true);

drop policy if exists ca_update_via_brand on public.cloudinary_assets;
create policy ca_update_via_brand on public.cloudinary_assets
  for update to authenticated using (true) with check (true);

drop policy if exists ca_delete_via_brand on public.cloudinary_assets;
create policy ca_delete_via_brand on public.cloudinary_assets
  for delete to authenticated using (true);

drop policy if exists ca_select_via_brand on public.cloudinary_assets;
create policy ca_select_via_brand on public.cloudinary_assets
  for select to authenticated using (true);

drop policy if exists asset_events_select on public.asset_events;
create policy asset_events_select on public.asset_events
  for select to authenticated using (true);

create or replace function public.get_brand_assets(p_brand_id uuid, p_shoot_id uuid default null)
returns json
language plpgsql
security definer
set search_path to 'public', 'shoot'
as $$
begin
  return '[]'::json;
end;
$$;

grant execute on function public.get_brand_assets(uuid, uuid) to authenticated, anon, public, service_role;

-- Precondition: insecure state must be visible
do $pre$
begin
  if not has_table_privilege('anon', 'public.assets', 'truncate') then
    raise exception 'CI seed failed: anon should have TRUNCATE on assets before migration';
  end if;
  if not has_table_privilege('authenticated', 'public.cloudinary_assets', 'insert') then
    raise exception 'CI seed failed: authenticated should INSERT cloudinary_assets before migration';
  end if;
  if not has_function_privilege('authenticated', 'public.get_brand_assets(uuid, uuid)', 'execute') then
    raise exception 'CI seed failed: authenticated should EXECUTE get_brand_assets before migration';
  end if;
end
$pre$;

-- CI-only seed for IPI-1111 apply_cloudinary_asset_event state-machine fixture.
-- Production-shaped tables/columns the RPC reads and writes (not a full media ACL seed).

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
end
$roles$;

create schema if not exists shoot;

do $enum$
begin
  if not exists (select 1 from pg_type where typname = 'asset_type') then
    create type public.asset_type as enum ('image', 'video', 'document');
  end if;
end
$enum$;

create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs (id),
  user_id uuid
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands (id),
  v2_shoot_id uuid,
  url text not null default '',
  asset_type public.asset_type not null default 'image',
  cloudinary_public_id text,
  width int,
  height int,
  file_size bigint,
  mime_type text,
  status text not null default 'ready',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cloudinary_assets (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete cascade,
  cloudinary_asset_id text,
  public_id text not null,
  secure_url text not null,
  resource_type text not null default 'image',
  delivery_type text not null default 'authenticated',
  version bigint,
  width int,
  height int,
  bytes bigint,
  format text,
  folder text,
  status text not null default 'processing',
  approval text not null default 'pending',
  moderation_status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cloudinary_assets_provider_id_uidx
  on public.cloudinary_assets (cloudinary_asset_id)
  where cloudinary_asset_id is not null;

create table if not exists public.asset_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete cascade,
  cloudinary_asset_id text,
  version bigint,
  kind text not null default 'upload',
  request_id text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists asset_events_request_asset_uidx
  on public.asset_events (request_id, asset_id)
  where request_id is not null;

grant execute on all functions in schema public to service_role;
grant all on table public.orgs to service_role;
grant all on table public.brands to service_role;
grant all on table public.assets to service_role;
grant all on table public.cloudinary_assets to service_role;
grant all on table public.asset_events to service_role;

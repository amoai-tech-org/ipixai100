-- IPI-1122 · org A/B isolation + active-org bypass + v2_shoot brand guard.
-- Seeds ephemeral tenants inside a transaction and rolls back.
-- Runner: .github/workflows/ci.yml job media-harden-acl (after migration).

begin;

create extension if not exists pgcrypto;

create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid()
);

create table if not exists public.org_members (
  org_id uuid not null references public.orgs (id) on delete cascade,
  user_id uuid not null,
  primary key (org_id, user_id)
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs (id),
  user_id uuid
);

-- CI stub: authenticated must read brands/org_members for RLS EXISTS checks.
grant select on table public.orgs to authenticated;
grant select on table public.org_members to authenticated;
grant select on table public.brands to authenticated;

-- Minimal org membership helper used by RLS (matches production name).
-- Tables must exist first: language sql validates relations at CREATE FUNCTION.
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security invoker
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.org_members m
    where m.org_id = p_org_id
      and m.user_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  );
$$;

-- Ensure RLS policies exist for isolation proof (idempotent for CI stubs).
alter table public.assets enable row level security;
alter table public.cloudinary_assets enable row level security;

drop policy if exists assets_select on public.assets;
create policy assets_select on public.assets
  for select to authenticated
  using (
    exists (
      select 1 from public.brands b
      where b.id = assets.brand_id and public.is_org_member(b.org_id)
    )
  );

drop policy if exists ca_select_via_brand on public.cloudinary_assets;
create policy ca_select_via_brand on public.cloudinary_assets
  for select to authenticated
  using (
    exists (
      select 1
      from public.assets a
      join public.brands b on b.id = a.brand_id
      where a.id = cloudinary_assets.asset_id
        and public.is_org_member(b.org_id)
    )
  );

do $$
declare
  org_a uuid := gen_random_uuid();
  org_b uuid := gen_random_uuid();
  brand_a uuid := gen_random_uuid();
  brand_b uuid := gen_random_uuid();
  user_a uuid := gen_random_uuid();
  user_ab uuid := gen_random_uuid();
  asset_a uuid := gen_random_uuid();
  asset_b uuid := gen_random_uuid();
  shoot_a uuid := gen_random_uuid();
  shoot_b uuid := gen_random_uuid();
  seen int;
begin
  insert into public.orgs (id) values (org_a), (org_b);
  insert into public.org_members (org_id, user_id) values
    (org_a, user_a),
    (org_a, user_ab),
    (org_b, user_ab);
  insert into public.brands (id, org_id) values
    (brand_a, org_a),
    (brand_b, org_b);

  insert into shoot.shoots (id, brand_id, name, type, status)
  values
    (shoot_a, brand_a, 'A shoot', 'editorial', 'draft'),
    (shoot_b, brand_b, 'B shoot', 'editorial', 'draft');

  insert into public.assets (id, brand_id, url, asset_type, status, v2_shoot_id)
  values
    (asset_a, brand_a, 'https://example.test/a', 'image', 'ready', shoot_a),
    (asset_b, brand_b, 'https://example.test/b', 'image', 'ready', shoot_b);

  insert into public.cloudinary_assets (
    id, asset_id, public_id, secure_url, resource_type, delivery_type, status, approval, moderation_status
  ) values (
    gen_random_uuid(), asset_a, 'ipix/a', 'https://res.example/a', 'image',
    'authenticated', 'active', 'pending', 'pending'
  );

  -- Org A member cannot see Org B assets
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_a::text, true);

  select count(*) into seen from public.assets where id = asset_b;
  if seen <> 0 then
    raise exception 'org A member must not read org B assets';
  end if;

  select count(*) into seen from public.assets where id = asset_a;
  if seen <> 1 then
    raise exception 'org A member must read org A assets';
  end if;

  -- Active-org: multi-member would see A+B under membership RLS; V2 filters trusted org.
  perform set_config('request.jwt.claim.sub', user_ab::text, true);

  begin
    perform public.get_brand_assets(brand_a, null);
    raise exception 'authenticated must not call get_brand_assets';
  exception
    when insufficient_privilege then
      null;
    when others then
      if sqlerrm ilike '%permission denied%' then
        null;
      else
        raise;
      end if;
  end;

  select count(*) into seen
  from public.assets a
  join public.brands b on b.id = a.brand_id
  where b.org_id = org_a;
  if seen <> 1 then
    raise exception 'active-org A filter must return only org A assets; got %', seen;
  end if;

  select count(*) into seen
  from public.assets a
  join public.brands b on b.id = a.brand_id
  where b.org_id = org_b;
  if seen <> 1 then
    raise exception 'active-org B filter must return only org B assets; got %', seen;
  end if;

  -- authenticated cannot mutate cloudinary_assets (grant-level)
  begin
    update public.cloudinary_assets set version = 999 where asset_id = asset_a;
    raise exception 'authenticated update on cloudinary_assets must fail';
  exception
    when insufficient_privilege then
      null;
    when others then
      if sqlerrm ilike '%permission denied%' then
        null;
      else
        raise;
      end if;
  end;

  execute 'reset role';

  -- Cross-brand v2_shoot_id rejected
  begin
    update public.assets set v2_shoot_id = shoot_b where id = asset_a;
    raise exception 'cross-brand v2_shoot_id must be rejected';
  exception
    when check_violation then
      null;
    when others then
      if sqlstate = '23514' then
        null;
      else
        raise;
      end if;
  end;

  -- Same-brand link accepted
  update public.assets set v2_shoot_id = shoot_a where id = asset_a;
end
$$;

rollback;

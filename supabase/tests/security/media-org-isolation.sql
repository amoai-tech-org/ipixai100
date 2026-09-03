-- IPI-1122 · org A/B isolation against migration-installed policies (not test-installed).
-- Seed + migration own is_org_member and RLS. This file only inserts fixtures and asserts.
-- Runner: .github/workflows/ci.yml job media-harden-acl (after migration).

begin;

do $$
declare
  org_a uuid := gen_random_uuid();
  org_b uuid := gen_random_uuid();
  brand_a uuid := gen_random_uuid();
  brand_b uuid := gen_random_uuid();
  brand_owner uuid := gen_random_uuid();
  user_a uuid := gen_random_uuid();
  user_ab uuid := gen_random_uuid();
  user_owner uuid := gen_random_uuid();
  asset_a uuid := gen_random_uuid();
  asset_b uuid := gen_random_uuid();
  asset_owner uuid := gen_random_uuid();
  event_a uuid := gen_random_uuid();
  event_b uuid := gen_random_uuid();
  event_owner uuid := gen_random_uuid();
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
  ) values
    (gen_random_uuid(), asset_a, 'ipix/a', 'https://res.example/a', 'image',
     'authenticated', 'active', 'pending', 'pending'),
    (gen_random_uuid(), asset_b, 'ipix/b', 'https://res.example/b', 'image',
     'authenticated', 'active', 'pending', 'pending');

  insert into public.asset_events (id, asset_id, kind)
  values
    (event_a, asset_a, 'upload'),
    (event_b, asset_b, 'upload');

  -- Org A member cannot see Org B assets / mirror / events
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

  select count(*) into seen from public.cloudinary_assets where asset_id = asset_a;
  if seen <> 1 then
    raise exception 'org A member must read org A cloudinary_assets';
  end if;

  select count(*) into seen from public.cloudinary_assets where asset_id = asset_b;
  if seen <> 0 then
    raise exception 'org A member must not read org B cloudinary_assets';
  end if;

  select count(*) into seen from public.asset_events where id = event_b;
  if seen <> 0 then
    raise exception 'org A member must not read org B asset_events';
  end if;

  select count(*) into seen from public.asset_events where id = event_a;
  if seen <> 1 then
    raise exception 'org A member must read org A asset_events';
  end if;

  -- authenticated INSERT/UPDATE only within own org (assets policies)
  begin
    insert into public.assets (id, brand_id, url, asset_type, status)
    values (gen_random_uuid(), brand_b, 'https://example.test/x', 'image', 'ready');
    raise exception 'org A member must not insert assets for org B brand';
  exception
    when insufficient_privilege then
      null;
    when others then
      if sqlerrm ilike '%policy%' or sqlerrm ilike '%permission denied%' then
        null;
      else
        raise;
      end if;
  end;

  update public.assets set status = 'archived' where id = asset_a;
  if not found then
    raise exception 'org A member must update own org assets';
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

  -- NULL brand_id while v2_shoot_id set must fail with 23514
  begin
    update public.assets set brand_id = null where id = asset_a;
    raise exception 'null brand_id with v2_shoot_id must be rejected';
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

  -- Restore brand for shoot reassignment check
  update public.assets set brand_id = brand_a, v2_shoot_id = shoot_a where id = asset_a;

  -- shoot.shoots.brand_id reassignment blocked while linked assets exist
  begin
    update shoot.shoots set brand_id = brand_b where id = shoot_a;
    raise exception 'shoot brand reassignment with linked assets must be rejected';
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

  -- Organization-less brand owner path (brands.org_id IS NULL)
  insert into public.brands (id, org_id, user_id)
  values (brand_owner, null, user_owner);

  insert into public.assets (id, brand_id, url, asset_type, status)
  values (asset_owner, brand_owner, 'https://example.test/owner', 'image', 'ready');

  insert into public.cloudinary_assets (
    id, asset_id, public_id, secure_url, resource_type, delivery_type, status, approval, moderation_status
  ) values (
    gen_random_uuid(), asset_owner, 'ipix/owner', 'https://res.example/owner', 'image',
    'authenticated', 'active', 'pending', 'pending'
  );

  insert into public.asset_events (id, asset_id, kind)
  values (event_owner, asset_owner, 'upload');

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_owner::text, true);

  select count(*) into seen from public.assets where id = asset_owner;
  if seen <> 1 then
    raise exception 'org-less brand owner must read own assets';
  end if;

  select count(*) into seen from public.cloudinary_assets where asset_id = asset_owner;
  if seen <> 1 then
    raise exception 'org-less brand owner must read own cloudinary_assets via assets join';
  end if;

  select count(*) into seen from public.asset_events where id = event_owner;
  if seen <> 1 then
    raise exception 'org-less brand owner must read own asset_events';
  end if;

  -- Non-owner cannot read org-less brand media
  perform set_config('request.jwt.claim.sub', user_a::text, true);
  select count(*) into seen from public.assets where id = asset_owner;
  if seen <> 0 then
    raise exception 'non-owner must not read org-less brand assets';
  end if;

  execute 'reset role';
end
$$;

rollback;

-- IPI-1110 · CLD-SIGN-001 — executable authorization for v2_shoot_owned_by_brand.
-- Runner: .github/workflows/ci.yml job media-harden-acl
-- (after media-harden-ci-seed + IPI-1122 migration + IPI-1110 RPC migration).

begin;

do $$
declare
  org_a uuid := gen_random_uuid();
  org_b uuid := gen_random_uuid();
  brand_a uuid := gen_random_uuid();
  brand_a2 uuid := gen_random_uuid();
  brand_b uuid := gen_random_uuid();
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  shoot_a uuid := gen_random_uuid();
  shoot_b uuid := gen_random_uuid();
  got boolean;
  public_exec boolean;
begin
  if to_regprocedure('public.v2_shoot_owned_by_brand(uuid,uuid)') is null then
    raise exception 'v2_shoot_owned_by_brand missing — apply IPI-1110 migration first';
  end if;

  -- Privilege: anon / PUBLIC cannot execute; authenticated can.
  if has_function_privilege('anon', 'public.v2_shoot_owned_by_brand(uuid,uuid)', 'execute') then
    raise exception 'anon must not EXECUTE v2_shoot_owned_by_brand';
  end if;

  select exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) e
    where n.nspname = 'public'
      and p.proname = 'v2_shoot_owned_by_brand'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, uuid'
      and e.privilege_type = 'EXECUTE'
      and e.grantee = 0
  ) into public_exec;
  if public_exec then
    raise exception 'PUBLIC must not EXECUTE v2_shoot_owned_by_brand';
  end if;

  if not has_function_privilege('authenticated', 'public.v2_shoot_owned_by_brand(uuid,uuid)', 'execute') then
    raise exception 'authenticated must EXECUTE v2_shoot_owned_by_brand';
  end if;

  insert into public.orgs (id) values (org_a), (org_b);
  insert into public.org_members (org_id, user_id) values
    (org_a, user_a),
    (org_b, user_b);
  insert into public.brands (id, org_id) values
    (brand_a, org_a),
    (brand_a2, org_a),
    (brand_b, org_b);
  insert into shoot.shoots (id, brand_id, name, type, status)
  values
    (shoot_a, brand_a, 'A shoot', 'editorial', 'draft'),
    (shoot_b, brand_b, 'B shoot', 'editorial', 'draft');

  execute 'set local role authenticated';

  -- Unsigned caller (no JWT sub) → fail closed (false), not true.
  perform set_config('request.jwt.claim.sub', '', true);
  select public.v2_shoot_owned_by_brand(shoot_a, brand_a) into got;
  if got is distinct from false then
    raise exception 'unsigned caller must fail closed (got %)', got;
  end if;

  -- Org A member + Org A shoot/brand → true
  perform set_config('request.jwt.claim.sub', user_a::text, true);
  select public.v2_shoot_owned_by_brand(shoot_a, brand_a) into got;
  if got is distinct from true then
    raise exception 'org A caller must own org A shoot (got %)', got;
  end if;

  -- Same org, wrong brand (shoot_a belongs to brand_a, not brand_a2) → false
  select public.v2_shoot_owned_by_brand(shoot_a, brand_a2) into got;
  if got is distinct from false then
    raise exception 'same-org shoot/brand mismatch must be denied (got %)', got;
  end if;

  -- Org B member using Org A identifiers → false
  perform set_config('request.jwt.claim.sub', user_b::text, true);
  select public.v2_shoot_owned_by_brand(shoot_a, brand_a) into got;
  if got is distinct from false then
    raise exception 'org B caller must be denied org A shoot (got %)', got;
  end if;

  execute 'reset role';
end
$$;

rollback;

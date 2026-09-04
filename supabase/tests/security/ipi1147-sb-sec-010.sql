-- IPI-1147 · SB-SEC-010 — ACL + RLS regression for trigger EXECUTE and
-- campaign policy role targeting.
-- Runner: .github/workflows/ci.yml (after IPI-1147 migration applied).
-- Assumes: talent schema + talent.bookings + trg_bookings_log_status_change
-- exist (legacy history), and public.campaigns / campaign_deliverables exist.

begin;

do $$
declare
  org_a uuid := gen_random_uuid();
  org_b uuid := gen_random_uuid();
  brand_a uuid := gen_random_uuid();
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  campaign_a uuid := gen_random_uuid();
  campaign_b uuid := gen_random_uuid();
  deliverable_a uuid := gen_random_uuid();
  n integer;
  anon_exec boolean;
  auth_exec boolean;
  pub_exec boolean;
  campaign_roles text[];
  deliverable_roles text[];
begin
  -- 1) Trigger function: no direct EXECUTE for PUBLIC / anon / authenticated.
  if to_regprocedure('talent.log_booking_status_change()') is null then
    raise exception 'talent.log_booking_status_change missing — apply IPI-1147 migration first';
  end if;

  select has_function_privilege('anon', 'talent.log_booking_status_change()', 'execute'),
         has_function_privilege('authenticated', 'talent.log_booking_status_change()', 'execute'),
         has_function_privilege('public', 'talent.log_booking_status_change()', 'execute')
    into anon_exec, auth_exec, pub_exec;

  if anon_exec then raise exception 'anon must not EXECUTE talent.log_booking_status_change'; end if;
  if auth_exec then raise exception 'authenticated must not EXECUTE talent.log_booking_status_change'; end if;
  if pub_exec then raise exception 'PUBLIC must not EXECUTE talent.log_booking_status_change'; end if;

  -- Trigger still exists and is enabled.
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_bookings_log_status_change'
      and tgrelid = 'talent.bookings'::regclass
      and tgenabled = 'O'
  ) then
    raise exception 'trg_bookings_log_status_change missing or disabled';
  end if;

  -- 2) Campaign policies target authenticated only (no empty-role / public).
  select array_agg(rolname order by rolname)
    into campaign_roles
    from pg_policy p
    cross join lateral (
      select rolname from pg_roles where oid = any(p.polroles)
    ) r
    where p.polrelid = 'public.campaigns'::regclass;

  if campaign_roles is null or array_length(campaign_roles, 1) = 0 then
    raise exception 'campaigns policies must target authenticated, not public';
  end if;
  if exists (select 1 from unnest(campaign_roles) r where r <> 'authenticated') then
    raise exception 'campaigns policies must target ONLY authenticated, got %', campaign_roles;
  end if;

  select array_agg(rolname order by rolname)
    into deliverable_roles
    from pg_policy p
    cross join lateral (
      select rolname from pg_roles where oid = any(p.polroles)
    ) r
    where p.polrelid = 'public.campaign_deliverables'::regclass;

  if deliverable_roles is null or array_length(deliverable_roles, 1) = 0 then
    raise exception 'campaign_deliverables policies must target authenticated, not public';
  end if;
  if exists (select 1 from unnest(deliverable_roles) r where r <> 'authenticated') then
    raise exception 'campaign_deliverables policies must target ONLY authenticated, got %', deliverable_roles;
  end if;

  -- 3) Predicates preserved: is_org_member gates every policy.
  select count(*) into n
    from pg_policy
    where polrelid in ('public.campaigns'::regclass, 'public.campaign_deliverables'::regclass)
      and pg_get_expr(polqual, polrelid) is not null
      and pg_get_expr(polqual, polrelid) like '%is_org_member%';
  if n < 6 then
    raise exception 'expected >= 6 campaign policies with is_org_member USING predicate, got %', n;
  end if;

  -- 4) Tenant isolation: Org B cannot read Org A campaign via RLS.
  insert into public.orgs (id) values (org_a), (org_b);
  insert into public.org_members (org_id, user_id) values (org_a, user_a), (org_b, user_b);
  insert into public.brands (id, org_id, user_id) values (brand_a, org_a, user_a);
  insert into public.campaigns (id, org_id, brand_id, name, status)
    values (campaign_a, org_a, brand_a, 'IPI-1147 Campaign A', 'planning'),
           (campaign_b, org_b, brand_a, 'IPI-1147 Campaign B', 'planning');

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_b::text, true);

  -- Org B user must not see Org A campaign.
  if exists (select 1 from public.campaigns where id = campaign_a) then
    raise exception 'Org B user saw Org A campaign (RLS leak)';
  end if;
  -- Org B user must see own campaign.
  if not exists (select 1 from public.campaigns where id = campaign_b) then
    raise exception 'Org B user could not see own campaign';
  end if;

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);

  -- 5) anon gets zero campaign data.
  execute 'set local role anon';
  if exists (select 1 from public.campaigns) then
    raise exception 'anon saw campaign rows (RLS leak)';
  end if;
  reset role;

  raise notice 'IPI-1147 security regression PASS';
end;
$$;

rollback;
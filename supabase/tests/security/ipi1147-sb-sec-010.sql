-- IPI-1147 · SPEC — Remove Unexpected Supabase Privileged Function Access and Prove Tenant-Safe RPCs
-- ACL + RLS regression for trigger EXECUTE and campaign policy role targeting.
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
  deliverable_b uuid := gen_random_uuid();
  deliverable_dual uuid := gen_random_uuid();
  user_dual uuid := gen_random_uuid();
  n integer;
  anon_exec boolean;
  auth_exec boolean;
  pub_exec boolean;
  auth_oid oid;
  p record;
  inserted boolean;
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

  -- 2) Per-policy role targeting: every campaign policy must target exactly
  --    the authenticated role. polroles containing the zero OID (0) means the
  --    policy applies to PUBLIC — reject it explicitly (OID 0 does not join
  --    to pg_roles, so a naive join silently hides PUBLIC policies).
  select oid into auth_oid from pg_roles where rolname = 'authenticated';

  for p in
    select polrelid::regclass::text as tbl, polname,
           array(select unnest(polroles)) as roles
    from pg_policy
    where polrelid in ('public.campaigns'::regclass, 'public.campaign_deliverables'::regclass)
    order by polrelid::regclass::text, polname
  loop
    if p.roles is null or array_length(p.roles, 1) <> 1 then
      raise exception 'policy % on % must target exactly one role, got %', p.polname, p.tbl, p.roles;
    end if;
    if p.roles[1] = 0 then
      raise exception 'policy % on % targets PUBLIC (OID 0) — must be authenticated', p.polname, p.tbl;
    end if;
    if p.roles[1] <> auth_oid then
      raise exception 'policy % on % must target authenticated, got OID %', p.polname, p.tbl, p.roles[1];
    end if;
  end loop;

  -- 3) Expected policy count: 4 on campaigns + 4 on campaign_deliverables.
  select count(*) into n
    from pg_policy
    where polrelid in ('public.campaigns'::regclass, 'public.campaign_deliverables'::regclass);
  if n <> 8 then
    raise exception 'expected 8 campaign policies, got %', n;
  end if;

  -- 4) Predicates preserved: is_org_member gates every USING predicate.
  select count(*) into n
    from pg_policy
    where polrelid in ('public.campaigns'::regclass, 'public.campaign_deliverables'::regclass)
      and pg_get_expr(polqual, polrelid) is not null
      and pg_get_expr(polqual, polrelid) like '%is_org_member%';
  if n < 6 then
    raise exception 'expected >= 6 campaign policies with is_org_member USING predicate, got %', n;
  end if;

  -- 5) Tenant isolation: Org B cannot read Org A campaign / deliverable via RLS.
  insert into public.orgs (id) values (org_a), (org_b);
  insert into public.org_members (org_id, user_id) values (org_a, user_a), (org_b, user_b), (org_a, user_dual), (org_b, user_dual);
  insert into public.brands (id, org_id, user_id) values (brand_a, org_a, user_a);
  insert into public.campaigns (id, org_id, brand_id, name, status)
    values (campaign_a, org_a, brand_a, 'IPI-1147 Campaign A', 'planning'),
           (campaign_b, org_b, brand_a, 'IPI-1147 Campaign B', 'planning');
  insert into public.campaign_deliverables (id, campaign_id, phase, label, status, assigned_to)
    values (deliverable_a, campaign_a, 1, 'IPI-1147 Deliverable A', 'draft', user_a),
           (deliverable_b, campaign_b, 1, 'IPI-1147 Deliverable B', 'draft', user_b),
           (deliverable_dual, campaign_b, 1, 'IPI-1147 Deliverable Dual', 'draft', user_dual);

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_b::text, true);

  -- Org B user must not see Org A campaign or its deliverable.
  if exists (select 1 from public.campaigns where id = campaign_a) then
    raise exception 'Org B user saw Org A campaign (RLS leak)';
  end if;
  if exists (select 1 from public.campaign_deliverables where id = deliverable_a) then
    raise exception 'Org B user saw Org A deliverable (RLS leak)';
  end if;
  -- Org B user must see own campaign and deliverable.
  if not exists (select 1 from public.campaigns where id = campaign_b) then
    raise exception 'Org B user could not see own campaign';
  end if;
  if not exists (select 1 from public.campaign_deliverables where id = deliverable_b) then
    raise exception 'Org B user could not see own deliverable';
  end if;

  -- 6) INSERT with-check: Org B cannot insert a deliverable into Org A campaign.
  inserted := false;
  begin
    insert into public.campaign_deliverables (id, campaign_id, phase, label, status)
      values (gen_random_uuid(), campaign_a, 1, 'IPI-1147 cross-org insert', 'draft');
    inserted := true;
  exception when insufficient_privilege or check_violation then
    null;
  end;
  if inserted then
    raise exception 'Org B user inserted a deliverable into Org A campaign (with-check leak)';
  end if;

  -- Org B CAN insert a deliverable into own campaign.
  begin
    insert into public.campaign_deliverables (id, campaign_id, phase, label, status)
      values (gen_random_uuid(), campaign_b, 1, 'IPI-1147 own insert', 'draft');
  exception when others then
    raise exception 'Org B user could not insert into own campaign: %', sqlerrm;
  end;

  -- 6b) UPDATE with-check: Org B cannot reparent own deliverable into Org A
  --     campaign (the cross-tenant reparenting exploit). WITH CHECK must
  --     reject it and the original campaign_id must remain unchanged.
  begin
    update public.campaign_deliverables
    set campaign_id = campaign_a
    where id = deliverable_b;
    inserted := true;
  exception when others then
    null;
  end;
  if inserted then
    raise exception 'Org B user reparented deliverable into Org A campaign (with-check leak)';
  end if;

  if exists (
    select 1 from public.campaign_deliverables
    where id = deliverable_b and campaign_id <> campaign_b
  ) then
    raise exception 'Org B deliverable campaign_id changed after rejected reparent';
  end if;

  -- 6c) Dual-membership denial: a user who belongs to BOTH org A and org B
  --     and is assigned_to on the deliverable must still not reparent it
  --     across organizations. RLS with-check passes (is_org_member true for
  --     both orgs, assigned_to matches), so the schema-level trigger
  --     (trg_campaign_deliverables_block_cross_org_reparent) must reject it.
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_dual::text, true);
  inserted := false;
  begin
    update public.campaign_deliverables
    set campaign_id = campaign_a
    where id = deliverable_dual;
    inserted := true;
  exception when others then
    null;
  end;
  if inserted then
    raise exception 'dual-membership user reparented deliverable across orgs (trigger leak)';
  end if;

  if exists (
    select 1 from public.campaign_deliverables
    where id = deliverable_dual and campaign_id <> campaign_b
  ) then
    raise exception 'dual-membership deliverable campaign_id changed after rejected reparent';
  end if;

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);

  -- 7) anon gets zero campaign / deliverable data.
  execute 'set local role anon';
  if exists (select 1 from public.campaigns) then
    raise exception 'anon saw campaign rows (RLS leak)';
  end if;
  if exists (select 1 from public.campaign_deliverables) then
    raise exception 'anon saw deliverable rows (RLS leak)';
  end if;
  reset role;

  raise notice 'IPI-1147 security regression PASS';
end;
$$;

rollback;
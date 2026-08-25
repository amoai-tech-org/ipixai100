-- IPI-897 · SB-SEC-009 standing guard.
-- New planner tables/sequences must not inherit anon/authenticated privileges.
-- Always rolls back. Finding 2 (supabase_admin) is NOTICE-only.

begin;

create table planner._ipi897_guard (id int primary key);
create sequence planner._ipi897_guard_seq;

do $$
begin
  if has_table_privilege('anon', 'planner._ipi897_guard', 'select')
     or has_table_privilege('anon', 'planner._ipi897_guard', 'insert') then
    raise exception 'anon must not inherit privileges on new planner tables';
  end if;

  if has_table_privilege('authenticated', 'planner._ipi897_guard', 'select')
     or has_table_privilege('authenticated', 'planner._ipi897_guard', 'insert')
     or has_table_privilege('authenticated', 'planner._ipi897_guard', 'update')
     or has_table_privilege('authenticated', 'planner._ipi897_guard', 'delete') then
    raise exception 'authenticated must not inherit CRUD on new planner tables';
  end if;

  if not has_table_privilege('service_role', 'planner._ipi897_guard', 'select') then
    raise exception 'service_role must keep table defaults on new planner tables';
  end if;

  if has_sequence_privilege('anon', 'planner._ipi897_guard_seq', 'usage')
     or has_sequence_privilege('authenticated', 'planner._ipi897_guard_seq', 'usage') then
    raise exception 'anon/authenticated must not inherit usage on new planner sequences';
  end if;

  if not has_sequence_privilege('service_role', 'planner._ipi897_guard_seq', 'usage') then
    raise exception 'service_role must keep sequence defaults on new planner sequences';
  end if;

  -- Existing tables are out of sweep scope; they must still be reachable.
  if not has_table_privilege('authenticated', 'planner.assignments', 'select') then
    raise exception 'existing planner.assignments must keep authenticated SELECT';
  end if;
end
$$;

-- Finding 2: keep NOTICE; do not fail the test.
do $$
declare
  acl text;
begin
  select d.defaclacl::text
    into acl
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace
  where pg_get_userbyid(d.defaclrole) = 'supabase_admin'
    and n.nspname = 'public'
    and d.defaclobjtype = 'r';

  if acl is not null and position('anon=' in acl) > 0 then
    raise notice 'Finding 2 KEEP: supabase_admin public table defaults still grant anon (unfixable without superuser)';
  end if;
end
$$;

rollback;

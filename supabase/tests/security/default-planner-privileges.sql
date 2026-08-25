-- IPI-897 · SB-SEC-009 standing guard.
-- New planner tables/sequences must not inherit anon/authenticated privileges.
-- Always rolls back. Finding 2 (supabase_admin) is NOTICE-only.
-- Runner: .github/workflows/ci.yml job planner-default-acl (psql). Not npm run build.

begin;

create table planner._ipi897_guard (id int primary key);
create sequence planner._ipi897_guard_seq;

do $$
declare
  table_privs text[] := array[
    'select', 'insert', 'update', 'delete',
    'truncate', 'references', 'trigger'
  ];
  seq_privs text[] := array['usage', 'select', 'update'];
  p text;
  jwt text;
begin
  foreach jwt in array array['anon', 'authenticated'] loop
    foreach p in array table_privs loop
      if has_table_privilege(jwt, 'planner._ipi897_guard', p) then
        raise exception '% must not have % on new planner tables', jwt, p;
      end if;
    end loop;
    foreach p in array seq_privs loop
      if has_sequence_privilege(jwt, 'planner._ipi897_guard_seq', p) then
        raise exception '% must not have % on new planner sequences', jwt, p;
      end if;
    end loop;
  end loop;

  -- GRANT ALL on tables → arwdDxt (and MAINTAIN on PG17+).
  foreach p in array table_privs loop
    if not has_table_privilege('service_role', 'planner._ipi897_guard', p) then
      raise exception 'service_role must have % on new planner tables', p;
    end if;
  end loop;

  if current_setting('server_version_num')::int >= 170000 then
    if has_table_privilege('anon', 'planner._ipi897_guard', 'maintain')
       or has_table_privilege('authenticated', 'planner._ipi897_guard', 'maintain') then
      raise exception 'anon/authenticated must not have maintain on new planner tables';
    end if;
    if not has_table_privilege('service_role', 'planner._ipi897_guard', 'maintain') then
      raise exception 'service_role must have maintain on new planner tables';
    end if;
  end if;

  foreach p in array seq_privs loop
    if not has_sequence_privilege('service_role', 'planner._ipi897_guard_seq', p) then
      raise exception 'service_role must have % on new planner sequences', p;
    end if;
  end loop;

  -- Existing tables are out of sweep scope (skip if CI has no dump).
  if to_regclass('planner.assignments') is not null
     and not has_table_privilege('authenticated', 'planner.assignments', 'select') then
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

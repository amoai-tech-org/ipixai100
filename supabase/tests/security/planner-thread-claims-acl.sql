-- IPI-1127 standing grant check. Assumes planner.planner_thread_claims exists.
-- Runner: .github/workflows/ci.yml job planner-default-acl (after IPI-1127 migration).

do $$
declare
  p text;
  jwt text;
begin
  if to_regclass('planner.planner_thread_claims') is null then
    raise exception 'planner.planner_thread_claims must exist';
  end if;

  foreach jwt in array array['anon', 'authenticated', 'ci_acl_probe'] loop
    foreach p in array array[
      'select', 'insert', 'update', 'delete',
      'truncate', 'references', 'trigger'
    ] loop
      if has_table_privilege(jwt, 'planner.planner_thread_claims', p) then
        raise exception '% must not have % on planner.planner_thread_claims', jwt, p;
      end if;
    end loop;
  end loop;

  if not has_table_privilege('hyperdrive_mastra_runtime', 'planner.planner_thread_claims', 'select')
     or not has_table_privilege('hyperdrive_mastra_runtime', 'planner.planner_thread_claims', 'insert') then
    raise exception 'hyperdrive_mastra_runtime must have SELECT, INSERT on planner.planner_thread_claims';
  end if;

  foreach p in array array['update', 'delete', 'truncate'] loop
    if has_table_privilege('hyperdrive_mastra_runtime', 'planner.planner_thread_claims', p) then
      raise exception 'hyperdrive_mastra_runtime must not have % on planner.planner_thread_claims', p;
    end if;
  end loop;
end
$$;

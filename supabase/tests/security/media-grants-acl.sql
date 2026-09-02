-- IPI-1122 · SB-MEDIA-HARDEN-001 standing grant checks.
-- Assumes media tables + migration applied.
-- Runner: .github/workflows/ci.yml job media-harden-acl

do $$
declare
  privilege_name text;
  role_name text;
  tbl text;
  comment_text text;
begin
  foreach tbl in array array[
    'public.assets',
    'public.cloudinary_assets',
    'public.asset_events'
  ] loop
    if to_regclass(tbl) is null then
      raise exception '% must exist', tbl;
    end if;

    foreach role_name in array array['anon', 'ci_acl_probe'] loop
      foreach privilege_name in array array[
        'select', 'insert', 'update', 'delete',
        'truncate', 'references', 'trigger'
      ] loop
        if has_table_privilege(role_name, tbl, privilege_name) then
          raise exception '% must not have % on %', role_name, privilege_name, tbl;
        end if;
      end loop;
    end loop;
  end loop;

  -- authenticated: no admin-like / provider-mirror writes
  foreach privilege_name in array array[
    'delete', 'truncate', 'references', 'trigger'
  ] loop
    if has_table_privilege('authenticated', 'public.assets', privilege_name) then
      raise exception 'authenticated must not have % on public.assets', privilege_name;
    end if;
  end loop;

  foreach privilege_name in array array[
    'insert', 'update', 'delete', 'truncate', 'references', 'trigger'
  ] loop
    if has_table_privilege('authenticated', 'public.cloudinary_assets', privilege_name) then
      raise exception 'authenticated must not have % on public.cloudinary_assets', privilege_name;
    end if;
  end loop;

  foreach privilege_name in array array[
    'insert', 'update', 'delete', 'truncate', 'references', 'trigger'
  ] loop
    if has_table_privilege('authenticated', 'public.asset_events', privilege_name) then
      raise exception 'authenticated must not have % on public.asset_events', privilege_name;
    end if;
  end loop;

  if not has_table_privilege('authenticated', 'public.assets', 'select')
     or not has_table_privilege('authenticated', 'public.assets', 'insert')
     or not has_table_privilege('authenticated', 'public.assets', 'update') then
    raise exception 'authenticated must keep SELECT, INSERT, UPDATE on public.assets';
  end if;

  if not has_table_privilege('authenticated', 'public.cloudinary_assets', 'select') then
    raise exception 'authenticated must keep SELECT on public.cloudinary_assets';
  end if;

  if not has_table_privilege('authenticated', 'public.asset_events', 'select') then
    raise exception 'authenticated must keep SELECT on public.asset_events';
  end if;

  if not has_table_privilege('service_role', 'public.cloudinary_assets', 'insert')
     or not has_table_privilege('service_role', 'public.cloudinary_assets', 'update') then
    raise exception 'service_role must retain INSERT, UPDATE on public.cloudinary_assets';
  end if;

  -- write policies must be gone for authenticated cloudinary mirror
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'cloudinary_assets'
      and policyname in ('ca_insert_via_brand', 'ca_update_via_brand', 'ca_delete_via_brand')
  ) then
    raise exception 'authenticated cloudinary_assets write policies must be dropped';
  end if;

  select col_description('public.cloudinary_assets'::regclass, a.attnum)
    into comment_text
  from pg_attribute a
  where a.attrelid = 'public.cloudinary_assets'::regclass
    and a.attname = 'delivery_type';

  if comment_text is null
     or comment_text ilike '%then upload%'
     or comment_text ilike '%public)%' then
    raise exception 'delivery_type comment must not imply approval flips to public upload; got: %', comment_text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'assets' and column_name = 'v2_shoot_id'
  ) then
    raise exception 'public.assets.v2_shoot_id must exist';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'assets_v2_shoot_id_fkey'
      and conrelid = 'public.assets'::regclass
  ) then
    raise exception 'assets_v2_shoot_id_fkey must exist';
  end if;

  -- legacy FK preserved
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assets_shoot_id_fkey'
      and conrelid = 'public.assets'::regclass
  ) then
    raise exception 'legacy assets_shoot_id_fkey must remain';
  end if;

  if to_regprocedure('public.get_brand_assets(uuid, uuid)') is not null then
    if has_function_privilege('authenticated', 'public.get_brand_assets(uuid, uuid)', 'execute') then
      raise exception 'authenticated must not EXECUTE get_brand_assets (active-org bypass)';
    end if;
    if has_function_privilege('anon', 'public.get_brand_assets(uuid, uuid)', 'execute') then
      raise exception 'anon must not EXECUTE get_brand_assets';
    end if;
    if not has_function_privilege('service_role', 'public.get_brand_assets(uuid, uuid)', 'execute') then
      raise exception 'service_role must retain EXECUTE on get_brand_assets';
    end if;
  end if;
end
$$;

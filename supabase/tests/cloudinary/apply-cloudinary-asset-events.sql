-- IPI-1111 · CLD-WEBHOOK-001 — SQL state-machine fixtures.
-- Requires migrations applied in order:
--   20260903020000_ipi1111_apply_cloudinary_asset_event.sql
--   20260905094610_ipi1111-schema-version-guard.sql
-- on a schema matching apply-cloudinary-ci-seed.sql (CI) or production-shaped tables.
-- Runner: CI job cloudinary-webhook-rpc (also safe manually with rollback).
--
-- Covers: duplicate-after-delete, stale delete, two-resource delete batch,
-- foreign brand (no move), partial rename (preserve resource_type), missing provider id,
-- first-seen schema_version guard, missing org_id, brand/org mismatch, existing-provider ownership.

begin;

do $$
declare
  org_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  org_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  brand_a uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  brand_b uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  owner uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  asset_1 uuid := '11111111-1111-4111-8111-111111111111';
  asset_2 uuid := '22222222-2222-4222-8222-222222222222';
  provider_1 text := 'cld-provider-1';
  provider_2 text := 'cld-provider-2';
  r jsonb;
  batch jsonb;
  status_text text;
  version_n bigint;
  resource_t text;
  brand_seen uuid;
begin
  -- Minimal org/brand fixtures (match CI seed: brands has no name column).
  insert into public.orgs (id) values (org_a), (org_b)
  on conflict (id) do nothing;

  insert into public.brands (id, org_id, user_id)
  values
    (brand_a, org_a, owner),
    (brand_b, org_b, owner)
  on conflict (id) do nothing;

  ---------------------------------------------------------------------------
  -- Upload v8
  ---------------------------------------------------------------------------
  r := public.apply_cloudinary_asset_event(jsonb_build_object(
    'kind', 'upload',
    'cloudinary_asset_id', provider_1,
    'version', 8,
    'public_id', 'brands/a/shot',
    'secure_url', 'https://res.example/a',
    'resource_type', 'image',
    'delivery_type', 'authenticated',
    'request_id', 'req-upload-v8',
    'asset_id', asset_1,
    'brand_id', brand_a,
    'org_id', org_a,
    'schema_version', '1',
    'format', 'jpg'
  ));
  if r->>'outcome' is distinct from 'applied' then
    raise exception 'upload v8 expected applied, got %', r;
  end if;

  ---------------------------------------------------------------------------
  -- Delete archives v8
  ---------------------------------------------------------------------------
  r := public.apply_cloudinary_asset_event(jsonb_build_object(
    'kind', 'deleted',
    'cloudinary_asset_id', provider_1,
    'version', 8,
    'public_id', 'brands/a/shot',
    'request_id', 'req-delete-v8'
  ));
  if r->>'outcome' is distinct from 'archived' then
    raise exception 'delete v8 expected archived, got %', r;
  end if;

  select status into strict status_text
  from public.cloudinary_assets where cloudinary_asset_id = provider_1;
  if status_text is distinct from 'archived' then
    raise exception 'mirror should be archived, got %', status_text;
  end if;

  ---------------------------------------------------------------------------
  -- Duplicate equal-version upload must NOT resurrect
  ---------------------------------------------------------------------------
  r := public.apply_cloudinary_asset_event(jsonb_build_object(
    'kind', 'upload',
    'cloudinary_asset_id', provider_1,
    'version', 8,
    'public_id', 'brands/a/shot',
    'secure_url', 'https://res.example/a',
    'request_id', 'req-upload-v8',
    'asset_id', asset_1,
    'brand_id', brand_a,
    'org_id', org_a
  ));
  if (r->>'outcome') is distinct from 'noop_duplicate'
     and (r->>'outcome') is distinct from 'noop_equal_version' then
    raise exception 'duplicate-after-delete expected noop, got %', r;
  end if;

  select status into strict status_text
  from public.cloudinary_assets where cloudinary_asset_id = provider_1;
  if status_text is distinct from 'archived' then
    raise exception 'equal-version retry resurrected mirror to %', status_text;
  end if;

  ---------------------------------------------------------------------------
  -- Newer overwrite restores ready (version 9 > 8)
  ---------------------------------------------------------------------------
  r := public.apply_cloudinary_asset_event(jsonb_build_object(
    'kind', 'overwrite',
    'cloudinary_asset_id', provider_1,
    'version', 9,
    'public_id', 'brands/a/shot',
    'secure_url', 'https://res.example/a9',
    'request_id', 'req-overwrite-v9',
    'asset_id', asset_1,
    'brand_id', brand_b,
    'org_id', org_b
  ));
  if r->>'outcome' is distinct from 'applied' then
    raise exception 'overwrite v9 expected applied, got %', r;
  end if;

  select a.brand_id, c.status, c.version
  into strict brand_seen, status_text, version_n
  from public.cloudinary_assets c
  join public.assets a on a.id = c.asset_id
  where c.cloudinary_asset_id = provider_1;

  if brand_seen is distinct from brand_a then
    raise exception 'foreign brand must not move existing asset (got %)', brand_seen;
  end if;
  if status_text is distinct from 'ready' or version_n is distinct from 9 then
    raise exception 'overwrite should ready@9, got %@%', status_text, version_n;
  end if;

  ---------------------------------------------------------------------------
  -- Stale delete (v8 after v9) must not archive
  ---------------------------------------------------------------------------
  r := public.apply_cloudinary_asset_event(jsonb_build_object(
    'kind', 'deleted',
    'cloudinary_asset_id', provider_1,
    'version', 8,
    'request_id', 'req-stale-delete'
  ));
  if r->>'outcome' is distinct from 'noop_stale' then
    raise exception 'stale delete expected noop_stale, got %', r;
  end if;

  select status into strict status_text
  from public.cloudinary_assets where cloudinary_asset_id = provider_1;
  if status_text is distinct from 'ready' then
    raise exception 'stale delete archived newer state';
  end if;

  ---------------------------------------------------------------------------
  -- Missing provider id
  ---------------------------------------------------------------------------
  r := public.apply_cloudinary_asset_event(jsonb_build_object(
    'kind', 'upload',
    'version', 1,
    'public_id', 'x',
    'secure_url', 'https://res.example/x',
    'request_id', 'req-no-provider',
    'asset_id', asset_2,
    'brand_id', brand_a,
    'org_id', org_a
  ));
  if r->>'outcome' is distinct from 'noop_missing_provider_id' then
    raise exception 'missing provider expected noop_missing_provider_id, got %', r;
  end if;

  ---------------------------------------------------------------------------
  -- Provider id present but unknown on delete — no public_id fallback
  ---------------------------------------------------------------------------
  r := public.apply_cloudinary_asset_event(jsonb_build_object(
    'kind', 'deleted',
    'cloudinary_asset_id', 'unknown-provider',
    'public_id', 'brands/a/shot',
    'version', 9,
    'request_id', 'req-unknown-delete'
  ));
  if r->>'outcome' is distinct from 'noop_delete_unknown' then
    raise exception 'unknown provider delete expected noop_delete_unknown, got %', r;
  end if;

  select status into strict status_text
  from public.cloudinary_assets where cloudinary_asset_id = provider_1;
  if status_text is distinct from 'ready' then
    raise exception 'public_id fallback archived wrong asset';
  end if;

  ---------------------------------------------------------------------------
  -- Partial rename must not overwrite resource_type with defaults
  ---------------------------------------------------------------------------
  select resource_type into strict resource_t
  from public.cloudinary_assets where cloudinary_asset_id = provider_1;

  r := public.apply_cloudinary_asset_event(jsonb_build_object(
    'kind', 'rename',
    'cloudinary_asset_id', provider_1,
    'version', 10,
    'public_id', 'brands/a/renamed',
    'request_id', 'req-rename-partial'
  ));
  if r->>'outcome' is distinct from 'applied' then
    raise exception 'partial rename expected applied, got %', r;
  end if;

  if (select resource_type from public.cloudinary_assets where cloudinary_asset_id = provider_1)
     is distinct from resource_t then
    raise exception 'partial rename overwrote resource_type';
  end if;

  ---------------------------------------------------------------------------
  -- Two-resource delete batch
  ---------------------------------------------------------------------------
  r := public.apply_cloudinary_asset_event(jsonb_build_object(
    'kind', 'upload',
    'cloudinary_asset_id', provider_2,
    'version', 1,
    'public_id', 'brands/a/shot2',
    'secure_url', 'https://res.example/a2',
    'resource_type', 'image',
    'delivery_type', 'authenticated',
    'request_id', 'req-upload-2',
    'asset_id', asset_2,
    'brand_id', brand_a,
    'org_id', org_a,
    'schema_version', '1'
  ));
  if r->>'outcome' is distinct from 'applied' then
    raise exception 'second upload expected applied, got %', r;
  end if;

  batch := public.apply_cloudinary_asset_events(jsonb_build_array(
    jsonb_build_object(
      'kind', 'deleted',
      'cloudinary_asset_id', provider_1,
      'version', 10,
      'request_id', 'req-batch-del-1'
    ),
    jsonb_build_object(
      'kind', 'deleted',
      'cloudinary_asset_id', provider_2,
      'version', 1,
      'request_id', 'req-batch-del-2'
    )
  ));
  if batch->>'outcome' is distinct from 'batch_applied' then
    raise exception 'batch delete expected batch_applied, got %', batch;
  end if;
  if jsonb_array_length(batch->'results') is distinct from 2 then
    raise exception 'batch delete expected 2 results, got %', batch;
  end if;
  if (batch->'results'->0->>'outcome') is distinct from 'archived'
     or (batch->'results'->1->>'outcome') is distinct from 'archived' then
    raise exception 'batch delete outcomes not archived: %', batch;
  end if;

  ---------------------------------------------------------------------------
  -- IPI-1111 regression: first-seen asset without schema_version must be rejected
  ---------------------------------------------------------------------------
  r := public.apply_cloudinary_asset_event(jsonb_build_object(
    'kind', 'upload',
    'cloudinary_asset_id', 'cld-no-schema',
    'version', 1,
    'public_id', 'brands/a/no-schema',
    'secure_url', 'https://res.example/no-schema',
    'resource_type', 'image',
    'delivery_type', 'authenticated',
    'request_id', 'req-no-schema',
    'asset_id', asset_1,
    'brand_id', brand_a,
    'org_id', org_a
  ));
  if r->>'outcome' is distinct from 'noop_missing_schema_version' then
    raise exception 'first-seen without schema_version expected noop_missing_schema_version, got %', r;
  end if;

  -- No asset or mirror row should have been created for the rejected provider.
  if exists (select 1 from public.cloudinary_assets where cloudinary_asset_id = 'cld-no-schema') then
    raise exception 'first-seen without schema_version created a mirror row';
  end if;

  ---------------------------------------------------------------------------
  -- IPI-1111 regression: first-seen asset with schema_version=1 but missing org_id
  ---------------------------------------------------------------------------
  r := public.apply_cloudinary_asset_event(jsonb_build_object(
    'kind', 'upload',
    'cloudinary_asset_id', 'cld-no-org',
    'version', 1,
    'public_id', 'brands/a/no-org',
    'secure_url', 'https://res.example/no-org',
    'resource_type', 'image',
    'delivery_type', 'authenticated',
    'request_id', 'req-no-org',
    'asset_id', asset_1,
    'brand_id', brand_a,
    'schema_version', '1'
  ));
  if r->>'outcome' is distinct from 'noop_missing_org_id' then
    raise exception 'first-seen without org_id expected noop_missing_org_id, got %', r;
  end if;

  if exists (select 1 from public.cloudinary_assets where cloudinary_asset_id = 'cld-no-org') then
    raise exception 'first-seen without org_id created a mirror row';
  end if;

  ---------------------------------------------------------------------------
  -- IPI-1111 regression: first-seen asset with brand/org mismatch
  ---------------------------------------------------------------------------
  r := public.apply_cloudinary_asset_event(jsonb_build_object(
    'kind', 'upload',
    'cloudinary_asset_id', 'cld-mismatch',
    'version', 1,
    'public_id', 'brands/a/mismatch',
    'secure_url', 'https://res.example/mismatch',
    'resource_type', 'image',
    'delivery_type', 'authenticated',
    'request_id', 'req-mismatch',
    'asset_id', asset_1,
    'brand_id', brand_a,
    'org_id', org_b,
    'schema_version', '1'
  ));
  if r->>'outcome' is distinct from 'noop_unknown_brand' then
    raise exception 'first-seen with brand/org mismatch expected noop_unknown_brand, got %', r;
  end if;

  if exists (select 1 from public.cloudinary_assets where cloudinary_asset_id = 'cld-mismatch') then
    raise exception 'first-seen with brand/org mismatch created a mirror row';
  end if;

  ---------------------------------------------------------------------------
  -- IPI-1111 regression: existing asset ignores malicious context
  ---------------------------------------------------------------------------
  -- provider_1 already exists with brand_a/org_a. A replay with brand_b/org_b
  -- must NOT retarget ownership.
  r := public.apply_cloudinary_asset_event(jsonb_build_object(
    'kind', 'overwrite',
    'cloudinary_asset_id', provider_1,
    'version', 11,
    'public_id', 'brands/a/shot',
    'secure_url', 'https://res.example/a11',
    'request_id', 'req-malicious-overwrite',
    'asset_id', asset_1,
    'brand_id', brand_b,
    'org_id', org_b,
    'schema_version', '1'
  ));
  if r->>'outcome' is distinct from 'applied' then
    raise exception 'existing asset overwrite expected applied, got %', r;
  end if;

  select a.brand_id, a.v2_shoot_id
  into strict brand_seen, resource_t
  from public.assets a
  where a.id = asset_1;

  if brand_seen is distinct from brand_a then
    raise exception 'existing asset brand was retargeted to %', brand_seen;
  end if;

  raise notice 'IPI-1111 SQL state-machine fixtures OK';
end $$;

rollback;

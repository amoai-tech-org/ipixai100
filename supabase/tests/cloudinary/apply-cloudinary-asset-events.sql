-- IPI-1111 · CLD-WEBHOOK-001 — SQL state-machine fixtures.
-- Requires migration 20260903020000_ipi1111_apply_cloudinary_asset_event.sql applied.
-- Runner: manual / preview — wrap in a transaction that rolls back.
--
-- Covers: duplicate-after-delete, stale delete, two-resource delete batch,
-- foreign brand (no move), partial rename (preserve resource_type), missing provider id.

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
  -- Minimal org/brand fixtures (ignore if already present).
  insert into public.orgs (id) values (org_a), (org_b)
  on conflict (id) do nothing;

  insert into public.brands (id, org_id, user_id, name)
  values
    (brand_a, org_a, owner, 'Brand A'),
    (brand_b, org_b, owner, 'Brand B')
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
    'format', 'jpg'
  ));
  if r->>'outcome' <> 'applied' then
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
  if r->>'outcome' <> 'archived' then
    raise exception 'delete v8 expected archived, got %', r;
  end if;

  select status into status_text
  from public.cloudinary_assets where cloudinary_asset_id = provider_1;
  if status_text <> 'archived' then
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
  if r->>'outcome' not in ('noop_duplicate', 'noop_equal_version') then
    raise exception 'duplicate-after-delete expected noop, got %', r;
  end if;

  select status into status_text
  from public.cloudinary_assets where cloudinary_asset_id = provider_1;
  if status_text <> 'archived' then
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
  if r->>'outcome' <> 'applied' then
    raise exception 'overwrite v9 expected applied, got %', r;
  end if;

  select a.brand_id, c.status, c.version
  into brand_seen, status_text, version_n
  from public.cloudinary_assets c
  join public.assets a on a.id = c.asset_id
  where c.cloudinary_asset_id = provider_1;

  if brand_seen <> brand_a then
    raise exception 'foreign brand must not move existing asset (got %)', brand_seen;
  end if;
  if status_text <> 'ready' or version_n <> 9 then
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
  if r->>'outcome' <> 'noop_stale' then
    raise exception 'stale delete expected noop_stale, got %', r;
  end if;

  select status into status_text
  from public.cloudinary_assets where cloudinary_asset_id = provider_1;
  if status_text <> 'ready' then
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
  if r->>'outcome' <> 'noop_missing_provider_id' then
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
  if r->>'outcome' <> 'noop_delete_unknown' then
    raise exception 'unknown provider delete expected noop_delete_unknown, got %', r;
  end if;

  select status into status_text
  from public.cloudinary_assets where cloudinary_asset_id = provider_1;
  if status_text <> 'ready' then
    raise exception 'public_id fallback archived wrong asset';
  end if;

  ---------------------------------------------------------------------------
  -- Partial rename must not overwrite resource_type with defaults
  ---------------------------------------------------------------------------
  select resource_type into resource_t
  from public.cloudinary_assets where cloudinary_asset_id = provider_1;

  r := public.apply_cloudinary_asset_event(jsonb_build_object(
    'kind', 'rename',
    'cloudinary_asset_id', provider_1,
    'version', 10,
    'public_id', 'brands/a/renamed',
    'request_id', 'req-rename-partial'
  ));
  if r->>'outcome' <> 'applied' then
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
    'org_id', org_a
  ));
  if r->>'outcome' <> 'applied' then
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
  if batch->>'outcome' <> 'batch_applied' then
    raise exception 'batch delete expected batch_applied, got %', batch;
  end if;
  if jsonb_array_length(batch->'results') <> 2 then
    raise exception 'batch delete expected 2 results, got %', batch;
  end if;
  if (batch->'results'->0->>'outcome') <> 'archived'
     or (batch->'results'->1->>'outcome') <> 'archived' then
    raise exception 'batch delete outcomes not archived: %', batch;
  end if;

  raise notice 'IPI-1111 SQL state-machine fixtures OK';
end $$;

rollback;

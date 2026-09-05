-- IPI-1111 · CLD-WEBHOOK-001 — Require complete trusted context for first-seen assets
-- This guard ensures that first-seen Cloudinary provider assets (no existing
-- cloudinary_assets mirror) must carry schema_version=1 and a trusted full
-- context (internal_asset_id + brand_id + org_id with brand.org_id == org_id).
-- Existing-asset paths (overwrite/rename/delete) skip this check to preserve
-- idempotency and retroactive-webhook safety.

-- Once applied, the function will reject first-seen events missing schema_version=1
-- with outcome 'noop_missing_schema_version' instead of creating a business asset
-- without trusted context.

-- Changes to public.apply_cloudinary_asset_event():
-- 1. Added schema_version check in the "if not found then" branch (first-seen assets)
-- 2. Returns 'noop_missing_schema_version' if schema_version != '1'
-- 3. Preserves all existing behavior for existing assets and valid first-seen events

-- The guard is placed after the existing brand/org validation (which verifies
-- brand.org_id == org_id when org_id is supplied) and before the new-provider-
-- asset identity/organization checks. It only applies when `not found` (i.e. this
-- is a first-seen provider asset with no existing cloudinary_assets mirror).

-- Outcome: 'noop_missing_schema_version'
--   cloudinary_asset_id: the provider asset ID
--   This is a terminal OK outcome — no retry needed, no business row created.

create or replace function public.apply_cloudinary_asset_event(p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'shoot'
as $$
declare
  v_kind text := coalesce(p_event->>'kind', '');
  v_provider_id text := nullif(p_event->>'cloudinary_asset_id', '');
  v_version bigint := nullif(p_event->>'version', '')::bigint;
  v_public_id text := nullif(p_event->>'public_id', '');
  v_secure_url text := nullif(p_event->>'secure_url', '');
  v_resource_type text := nullif(p_event->>'resource_type', '');
  v_delivery_type text := nullif(p_event->>'delivery_type', '');
  v_width int := nullif(p_event->>'width', '')::int;
  v_height int := nullif(p_event->>'height', '')::int;
  v_bytes bigint := nullif(p_event->>'bytes', '')::bigint;
  v_format text := nullif(p_event->>'format', '');
  v_folder text := nullif(p_event->>'folder', '');
  v_request_id text := nullif(p_event->>'request_id', '');
  v_internal_asset_id uuid := coalesce(
    nullif(p_event->>'asset_id', ''),
    nullif(p_event->>'ipix_asset_id', '')
  )::uuid;
  v_brand_id uuid := nullif(p_event->>'brand_id', '')::uuid;
  v_org_id uuid := nullif(p_event->>'org_id', '')::uuid;
  v_v2_shoot_id uuid := nullif(p_event->>'v2_shoot_id', '')::uuid;
  v_asset_type public.asset_type;
  v_mime text;
  v_row public.cloudinary_assets%rowtype;
  v_asset_id uuid;
  v_event_kind text;
  v_inserted int := 0;
  v_effective_resource text;
  v_effective_delivery text;
  v_schema_version text := coalesce(p_event->>'schema_version', '');
begin
  if v_kind not in ('upload', 'overwrite', 'rename', 'deleted') then
    return jsonb_build_object('outcome', 'noop_ignored_kind', 'kind', v_kind);
  end if;

  if v_request_id is null then
    return jsonb_build_object('outcome', 'noop_missing_request_id');
  end if;

  if v_delivery_type is not null
     and v_delivery_type not in ('upload', 'authenticated', 'private') then
    v_delivery_type := 'authenticated';
  end if;

  ---------------------------------------------------------------------------
  -- DELETE / ARCHIVE
  ---------------------------------------------------------------------------
  if v_kind = 'deleted' then
    if v_provider_id is not null then
      select * into v_row
      from public.cloudinary_assets
      where cloudinary_asset_id = v_provider_id
      for update;
    elsif v_public_id is not null then
      select * into v_row
      from public.cloudinary_assets
      where public_id = v_public_id
      for update;
    end if;

    if not found then
      return jsonb_build_object(
        'outcome', 'noop_delete_unknown',
        'cloudinary_asset_id', v_provider_id,
        'public_id', v_public_id
      );
    end if;

    -- Same newest-version guard as upload.
    if v_version is not null
       and v_row.version is not null
       and v_version < v_row.version then
      return jsonb_build_object(
        'outcome', 'noop_stale',
        'asset_id', v_row.asset_id,
        'cloudinary_asset_id', coalesce(v_provider_id, v_row.cloudinary_asset_id),
        'version', v_row.version,
        'ignored_version', v_version
      );
    end if;

    v_asset_id := v_row.asset_id;

    -- Idempotency before mutate.
    insert into public.asset_events (
      asset_id, cloudinary_asset_id, version, kind, request_id, metadata
    )
    values (
      v_asset_id,
      coalesce(v_provider_id, v_row.cloudinary_asset_id),
      coalesce(v_version, v_row.version),
      'deleted',
      v_request_id,
      jsonb_build_object(
        'source', 'cloudinary_webhook',
        'public_id', coalesce(v_public_id, v_row.public_id)
      )
    )
    on conflict (request_id, asset_id) where (request_id is not null)
    do nothing;

    get diagnostics v_inserted = row_count;
    if v_inserted = 0 then
      return jsonb_build_object(
        'outcome', 'noop_duplicate_delete',
        'asset_id', v_asset_id,
        'cloudinary_asset_id', coalesce(v_provider_id, v_row.cloudinary_asset_id),
        'version', coalesce(v_version, v_row.version)
      );
    end if;

    update public.cloudinary_assets
    set
      status = 'archived',
      updated_at = now(),
      cloudinary_asset_id = coalesce(cloudinary_asset_id, v_provider_id),
      version = coalesce(v_version, version)
    where id = v_row.id;

    return jsonb_build_object(
      'outcome', 'archived',
      'asset_id', v_asset_id,
      'cloudinary_asset_id', coalesce(v_provider_id, v_row.cloudinary_asset_id),
      'version', coalesce(v_version, v_row.version)
    );
  end if;

  ---------------------------------------------------------------------------
  -- UPLOAD / OVERWRITE / RENAME
  ---------------------------------------------------------------------------
  if v_provider_id is null then
    return jsonb_build_object('outcome', 'noop_missing_provider_id');
  end if;

  -- Serialize concurrent first-seen events for the same provider id.
  perform pg_advisory_xact_lock(hashtext('cld:' || v_provider_id));

  select * into v_row
  from public.cloudinary_assets
  where cloudinary_asset_id = v_provider_id
  for update;

  v_event_kind := case
    when v_kind = 'overwrite' then 'overwrite'
    when v_kind = 'rename' then 'rename'
    else 'upload'
  end;

  if found then
    v_asset_id := v_row.asset_id;

    if v_version is not null and v_row.version is not null then
      if v_version < v_row.version then
        return jsonb_build_object(
          'outcome', 'noop_stale',
          'asset_id', v_asset_id,
          'cloudinary_asset_id', v_provider_id,
          'version', v_row.version,
          'ignored_version', v_version
        );
      end if;

      -- Equal version: never mutate (blocks resurrect-after-delete on retry).
      if v_version = v_row.version then
        insert into public.asset_events (
          asset_id, cloudinary_asset_id, version, kind, request_id, metadata
        )
        values (
          v_asset_id, v_provider_id, v_version, v_event_kind, v_request_id,
          jsonb_build_object(
            'source', 'cloudinary_webhook',
            'public_id', coalesce(v_public_id, v_row.public_id),
            'notification_kind', v_kind,
            'equal_version', true
          )
        )
        on conflict (request_id, asset_id) where (request_id is not null)
        do nothing;

        get diagnostics v_inserted = row_count;
        return jsonb_build_object(
          'outcome', case when v_inserted = 0 then 'noop_duplicate' else 'noop_equal_version' end,
          'asset_id', v_asset_id,
          'cloudinary_asset_id', v_provider_id,
          'version', v_row.version
        );
      end if;
    end if;

    -- Idempotency before mutate (version > stored, or either side null).
    insert into public.asset_events (
      asset_id, cloudinary_asset_id, version, kind, request_id, metadata
    )
    values (
      v_asset_id, v_provider_id, v_version, v_event_kind, v_request_id,
      jsonb_build_object(
        'source', 'cloudinary_webhook',
        'public_id', coalesce(v_public_id, v_row.public_id),
        'notification_kind', v_kind
      )
    )
    on conflict (request_id, asset_id) where (request_id is not null)
    do nothing;

    get diagnostics v_inserted = row_count;
    if v_inserted = 0 then
      return jsonb_build_object(
        'outcome', 'noop_duplicate',
        'asset_id', v_asset_id,
        'cloudinary_asset_id', v_provider_id,
        'version', coalesce(v_version, v_row.version)
      );
    end if;

    update public.cloudinary_assets
    set
      public_id = coalesce(v_public_id, public_id),
      secure_url = coalesce(v_secure_url, secure_url),
      resource_type = coalesce(v_resource_type, resource_type),
      delivery_type = coalesce(v_delivery_type, delivery_type),
      version = coalesce(v_version, version),
      width = coalesce(v_width, width),
      height = coalesce(v_height, height),
      bytes = coalesce(v_bytes, bytes),
      format = coalesce(v_format, format),
      folder = coalesce(v_folder, folder),
      status = 'ready',
      updated_at = now(),
      -- Merge org_id only when the event supplies it (null must not wipe stored org).
      metadata = metadata
        || jsonb_build_object('last_webhook_kind', v_kind)
        || case
             when v_org_id is not null then jsonb_build_object('org_id', v_org_id)
             else '{}'::jsonb
           end
    where id = v_row.id;

    -- Provider delivery fields only — brand_id / org / v2_shoot_id stay put.
    update public.assets
    set
      cloudinary_public_id = coalesce(v_public_id, cloudinary_public_id),
      url = coalesce(v_secure_url, url),
      width = coalesce(v_width, width),
      height = coalesce(v_height, height),
      file_size = coalesce(v_bytes, file_size),
      updated_at = now()
    where id = v_asset_id;

    return jsonb_build_object(
      'outcome', 'applied',
      'asset_id', v_asset_id,
      'cloudinary_asset_id', v_provider_id,
      'version', v_version
    );
  end if;

  -- New provider asset — identity from signed upload context.
  --
  -- IPI-1111 · CLD-WEBHOOK-001: first-seen assets must carry schema_version=1
  -- and a trusted full context (internal_asset_id + brand_id + org_id with
  -- brand.org_id == org_id). Existing-asset paths (overwrite/rename/delete)
  -- skip this to preserve idempotency / retroactive-webhook safety.
  --
  -- We are in the first-seen path (the `if found then ... end if;` block above
  -- handles existing assets and returns). Do NOT rely on PL/pgSQL FOUND here:
  -- the brand-existence query below would have overwritten it. The schema-version
  -- guard runs first so a first-seen event missing the trusted V2 context
  -- short-circuits deterministically ahead of any tenant-identity validation.
  if v_schema_version != '1' then
    return jsonb_build_object(
      'outcome', 'noop_missing_schema_version',
      'cloudinary_asset_id', v_provider_id
    );
  end if;

  if v_internal_asset_id is null then
    return jsonb_build_object(
      'outcome', 'noop_missing_asset_id',
      'cloudinary_asset_id', v_provider_id
    );
  end if;

  if v_brand_id is null then
    return jsonb_build_object(
      'outcome', 'noop_missing_brand_id',
      'cloudinary_asset_id', v_provider_id,
      'asset_id', v_internal_asset_id
    );
  end if;

  if v_public_id is null or v_secure_url is null then
    return jsonb_build_object(
      'outcome', 'noop_missing_delivery_fields',
      'cloudinary_asset_id', v_provider_id
    );
  end if;

  if v_org_id is null then
    return jsonb_build_object(
      'outcome', 'noop_missing_org_id',
      'cloudinary_asset_id', v_provider_id,
      'asset_id', v_internal_asset_id
    );
  end if;

  -- Brand must exist and belong to the supplied org.
  if not exists (
    select 1 from public.brands b
    where b.id = v_brand_id and b.org_id = v_org_id
  ) then
    return jsonb_build_object(
      'outcome', 'noop_unknown_brand',
      'brand_id', v_brand_id,
      'org_id', v_org_id
    );
  end if;

  v_effective_resource := coalesce(v_resource_type, 'image');
  v_effective_delivery := coalesce(v_delivery_type, 'authenticated');
  if v_effective_delivery not in ('upload', 'authenticated', 'private') then
    v_effective_delivery := 'authenticated';
  end if;

  v_asset_type := case
    when v_effective_resource = 'video' then 'video'::public.asset_type
    when v_effective_resource in ('raw', 'document') then 'document'::public.asset_type
    else 'image'::public.asset_type
  end;

  v_mime := case
    when v_format is null then null
    when v_effective_resource = 'video' then 'video/' || v_format
    when v_effective_resource in ('raw', 'document') then 'application/' || v_format
    else 'image/' || v_format
  end;

  insert into public.assets (
    id, brand_id, v2_shoot_id, url, asset_type, cloudinary_public_id,
    width, height, file_size, mime_type, status, metadata
  )
  values (
    v_internal_asset_id, v_brand_id, v_v2_shoot_id, v_secure_url, v_asset_type,
    v_public_id, v_width, v_height, v_bytes, v_mime, 'draft',
    jsonb_build_object('source', 'cloudinary_webhook', 'org_id', v_org_id)
  )
  on conflict (id) do update
  set
    -- Existing row: never retarget brand/org/shoot via webhook.
    url = excluded.url,
    cloudinary_public_id = excluded.cloudinary_public_id,
    width = coalesce(excluded.width, public.assets.width),
    height = coalesce(excluded.height, public.assets.height),
    file_size = coalesce(excluded.file_size, public.assets.file_size),
    mime_type = coalesce(excluded.mime_type, public.assets.mime_type),
    updated_at = now();

  v_asset_id := v_internal_asset_id;

  -- Idempotency before mirror insert.
  insert into public.asset_events (
    asset_id, cloudinary_asset_id, version, kind, request_id, metadata
  )
  values (
    v_asset_id, v_provider_id, v_version, v_event_kind, v_request_id,
    jsonb_build_object(
      'source', 'cloudinary_webhook',
      'public_id', v_public_id,
      'notification_kind', v_kind
    )
  )
  on conflict (request_id, asset_id) where (request_id is not null)
  do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return jsonb_build_object(
      'outcome', 'noop_duplicate',
      'asset_id', v_asset_id,
      'cloudinary_asset_id', v_provider_id,
      'version', v_version
    );
  end if;

  insert into public.cloudinary_assets (
    asset_id, cloudinary_asset_id, public_id, secure_url, resource_type,
    delivery_type, version, width, height, bytes, format, folder,
    status, approval, moderation_status, metadata
  )
  values (
    v_asset_id, v_provider_id, v_public_id, v_secure_url, v_effective_resource,
    v_effective_delivery, v_version, v_width, v_height, v_bytes, v_format, v_folder,
    'ready', 'pending', 'pending',
    jsonb_build_object(
      'source', 'cloudinary_webhook',
      'org_id', v_org_id,
      'last_webhook_kind', v_kind
    )
  );

  return jsonb_build_object(
    'outcome', 'applied',
    'asset_id', v_asset_id,
    'cloudinary_asset_id', v_provider_id,
    'version', v_version
  );
end;
$$;

comment on function public.apply_cloudinary_asset_event(jsonb) is
'IPI-1111: single-event Cloudinary webhook state machine (idempotency-first, version guard). service_role only.';
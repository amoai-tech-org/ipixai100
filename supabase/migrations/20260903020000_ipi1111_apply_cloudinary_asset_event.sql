-- IPI-1111 · CLD-WEBHOOK-001 — Transactional Cloudinary upload/delete mirror.
--
-- SECURITY DEFINER RPC for verified webhook/server only.
-- Does NOT retarget Cloudinary notification URLs (IPI-1115).
-- Does NOT mutate production ACL/type; DAM stays authenticated.
--
-- READY FOR APPROVAL: do not `supabase db push` to production without human approval.

create or replace function public.apply_cloudinary_asset_event(p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'shoot'
as $fn$
declare
  v_kind text := coalesce(p_event->>'kind', '');
  v_provider_id text := nullif(p_event->>'cloudinary_asset_id', '');
  v_version bigint := nullif(p_event->>'version', '')::bigint;
  v_public_id text := nullif(p_event->>'public_id', '');
  v_secure_url text := nullif(p_event->>'secure_url', '');
  v_resource_type text := coalesce(nullif(p_event->>'resource_type', ''), 'image');
  v_delivery_type text := coalesce(nullif(p_event->>'delivery_type', ''), 'authenticated');
  v_width int := nullif(p_event->>'width', '')::int;
  v_height int := nullif(p_event->>'height', '')::int;
  v_bytes bigint := nullif(p_event->>'bytes', '')::bigint;
  v_format text := nullif(p_event->>'format', '');
  v_folder text := nullif(p_event->>'folder', '');
  v_request_id text := nullif(p_event->>'request_id', '');
  v_ipix_asset_id uuid := nullif(p_event->>'ipix_asset_id', '')::uuid;
  v_brand_id uuid := nullif(p_event->>'brand_id', '')::uuid;
  v_org_id uuid := nullif(p_event->>'org_id', '')::uuid;
  v_v2_shoot_id uuid := nullif(p_event->>'v2_shoot_id', '')::uuid;
  v_asset_type public.asset_type;
  v_row public.cloudinary_assets%rowtype;
  v_asset_id uuid;
  v_event_kind text;
  v_inserted int := 0;
begin
  if v_kind not in ('upload', 'overwrite', 'rename', 'deleted') then
    return jsonb_build_object('outcome', 'noop_ignored_kind', 'kind', v_kind);
  end if;

  if v_request_id is null then
    return jsonb_build_object('outcome', 'noop_missing_request_id');
  end if;

  -- Map Cloudinary resource_type → assets.asset_type enum.
  v_asset_type := case
    when v_resource_type = 'video' then 'video'::public.asset_type
    when v_resource_type in ('raw', 'document') then 'document'::public.asset_type
    else 'image'::public.asset_type
  end;

  -- Keep delivery_type inside allowed check constraint.
  if v_delivery_type not in ('upload', 'authenticated', 'private') then
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
    end if;

    if not found and v_public_id is not null then
      select * into v_row
      from public.cloudinary_assets
      where public_id = v_public_id
      for update;
    end if;

    if not found then
      -- Nothing to archive — permanent no-op (do not invent tenancy from public_id).
      return jsonb_build_object(
        'outcome', 'noop_delete_unknown',
        'cloudinary_asset_id', v_provider_id,
        'public_id', v_public_id
      );
    end if;

    v_asset_id := v_row.asset_id;

    update public.cloudinary_assets
    set
      status = 'archived',
      updated_at = now(),
      cloudinary_asset_id = coalesce(cloudinary_asset_id, v_provider_id),
      version = coalesce(v_version, version)
    where id = v_row.id;

    insert into public.asset_events (
      asset_id,
      cloudinary_asset_id,
      version,
      kind,
      request_id,
      metadata
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

    return jsonb_build_object(
      'outcome', case when v_inserted = 0 then 'noop_duplicate_delete' else 'archived' end,
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

  -- Lock canonical mirror by immutable provider identity.
  select * into v_row
  from public.cloudinary_assets
  where cloudinary_asset_id = v_provider_id
  for update;

  if found then
    -- Stale version must not overwrite newer canonical state.
    if v_version is not null
       and v_row.version is not null
       and v_version < v_row.version then
      return jsonb_build_object(
        'outcome', 'noop_stale',
        'asset_id', v_row.asset_id,
        'cloudinary_asset_id', v_provider_id,
        'version', v_row.version,
        'ignored_version', v_version
      );
    end if;

    v_asset_id := v_row.asset_id;

    update public.cloudinary_assets
    set
      public_id = coalesce(v_public_id, public_id),
      secure_url = coalesce(v_secure_url, secure_url),
      resource_type = v_resource_type,
      delivery_type = v_delivery_type,
      version = coalesce(v_version, version),
      width = coalesce(v_width, width),
      height = coalesce(v_height, height),
      bytes = coalesce(v_bytes, bytes),
      format = coalesce(v_format, format),
      folder = coalesce(v_folder, folder),
      status = case when status = 'archived' then 'ready' else 'ready' end,
      updated_at = now(),
      metadata = metadata || jsonb_build_object(
        'last_webhook_kind', v_kind,
        'org_id', v_org_id
      )
    where id = v_row.id;

    -- Keep denormalized public_id on assets in sync (mutable location).
    if v_public_id is not null then
      update public.assets
      set
        cloudinary_public_id = v_public_id,
        url = coalesce(v_secure_url, url),
        width = coalesce(v_width, width),
        height = coalesce(v_height, height),
        file_size = coalesce(v_bytes, file_size),
        updated_at = now(),
        v2_shoot_id = coalesce(v_v2_shoot_id, v2_shoot_id),
        brand_id = coalesce(v_brand_id, brand_id)
      where id = v_asset_id;
    end if;
  else
    -- New provider asset — internal identity must come from signed upload context.
    if v_ipix_asset_id is null then
      return jsonb_build_object(
        'outcome', 'noop_missing_ipix_asset_id',
        'cloudinary_asset_id', v_provider_id
      );
    end if;

    if v_brand_id is null then
      return jsonb_build_object(
        'outcome', 'noop_missing_brand_id',
        'cloudinary_asset_id', v_provider_id,
        'ipix_asset_id', v_ipix_asset_id
      );
    end if;

    if v_public_id is null or v_secure_url is null then
      return jsonb_build_object(
        'outcome', 'noop_missing_delivery_fields',
        'cloudinary_asset_id', v_provider_id
      );
    end if;

    -- Ensure brand exists (fail closed rather than invent tenancy).
    if not exists (select 1 from public.brands b where b.id = v_brand_id) then
      return jsonb_build_object(
        'outcome', 'noop_unknown_brand',
        'brand_id', v_brand_id
      );
    end if;

    insert into public.assets (
      id,
      brand_id,
      v2_shoot_id,
      url,
      asset_type,
      cloudinary_public_id,
      width,
      height,
      file_size,
      mime_type,
      status,
      metadata
    )
    values (
      v_ipix_asset_id,
      v_brand_id,
      v_v2_shoot_id,
      v_secure_url,
      v_asset_type,
      v_public_id,
      v_width,
      v_height,
      v_bytes,
      case
        when v_format is null then null
        when v_resource_type = 'video' then 'video/' || v_format
        else 'image/' || v_format
      end,
      'draft',
      jsonb_build_object(
        'source', 'cloudinary_webhook',
        'org_id', v_org_id
      )
    )
    on conflict (id) do update
    set
      brand_id = coalesce(excluded.brand_id, public.assets.brand_id),
      v2_shoot_id = coalesce(excluded.v2_shoot_id, public.assets.v2_shoot_id),
      url = excluded.url,
      cloudinary_public_id = excluded.cloudinary_public_id,
      width = coalesce(excluded.width, public.assets.width),
      height = coalesce(excluded.height, public.assets.height),
      file_size = coalesce(excluded.file_size, public.assets.file_size),
      updated_at = now();

    v_asset_id := v_ipix_asset_id;

    begin
      insert into public.cloudinary_assets (
        asset_id,
        cloudinary_asset_id,
        public_id,
        secure_url,
        resource_type,
        delivery_type,
        version,
        width,
        height,
        bytes,
        format,
        folder,
        status,
        approval,
        moderation_status,
        metadata
      )
      values (
        v_asset_id,
        v_provider_id,
        v_public_id,
        v_secure_url,
        v_resource_type,
        v_delivery_type,
        v_version,
        v_width,
        v_height,
        v_bytes,
        v_format,
        v_folder,
        'ready',
        'pending',
        'pending',
        jsonb_build_object(
          'source', 'cloudinary_webhook',
          'org_id', v_org_id,
          'last_webhook_kind', v_kind
        )
      );
    exception
      when unique_violation then
        -- Concurrent insert raced; re-lock and apply newest-wins.
        select * into v_row
        from public.cloudinary_assets
        where cloudinary_asset_id = v_provider_id
        for update;

        if not found then
          raise;
        end if;

        if v_version is not null
           and v_row.version is not null
           and v_version < v_row.version then
          return jsonb_build_object(
            'outcome', 'noop_stale',
            'asset_id', v_row.asset_id,
            'cloudinary_asset_id', v_provider_id,
            'version', v_row.version,
            'ignored_version', v_version
          );
        end if;

        v_asset_id := v_row.asset_id;

        update public.cloudinary_assets
        set
          public_id = coalesce(v_public_id, public_id),
          secure_url = coalesce(v_secure_url, secure_url),
          version = coalesce(v_version, version),
          width = coalesce(v_width, width),
          height = coalesce(v_height, height),
          bytes = coalesce(v_bytes, bytes),
          format = coalesce(v_format, format),
          folder = coalesce(v_folder, folder),
          status = 'ready',
          updated_at = now()
        where id = v_row.id;
    end;
  end if;

  v_event_kind := case
    when v_kind = 'overwrite' then 'overwrite'
    when v_kind = 'rename' then 'rename'
    else 'upload'
  end;

  insert into public.asset_events (
    asset_id,
    cloudinary_asset_id,
    version,
    kind,
    request_id,
    metadata
  )
  values (
    v_asset_id,
    v_provider_id,
    v_version,
    v_event_kind,
    v_request_id,
    jsonb_build_object(
      'source', 'cloudinary_webhook',
      'public_id', v_public_id,
      'notification_kind', v_kind
    )
  )
  on conflict (request_id, asset_id) where (request_id is not null)
  do nothing;

  get diagnostics v_inserted = row_count;

  return jsonb_build_object(
    'outcome', case when v_inserted = 0 then 'noop_duplicate' else 'applied' end,
    'asset_id', v_asset_id,
    'cloudinary_asset_id', v_provider_id,
    'version', v_version
  );
end;
$fn$;

comment on function public.apply_cloudinary_asset_event(jsonb) is
  'IPI-1111: verified Cloudinary webhook transactional mirror (upload/overwrite/rename/delete→archive). service_role only.';

revoke all on function public.apply_cloudinary_asset_event(jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_cloudinary_asset_event(jsonb)
  to service_role;

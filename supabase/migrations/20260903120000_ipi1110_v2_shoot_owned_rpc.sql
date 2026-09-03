-- IPI-1110 · CLD-SIGN-001 — expose V2 shoot ownership check to PostgREST.
--
-- shoot.shoots is SQL/RPC-only (not in API schemas). The sign route must not
-- call .schema("shoot"); use this SECURITY DEFINER boolean RPC instead.
-- Caller JWT required. Brand ownership remains enforced in the app layer.

create or replace function public.v2_shoot_owned_by_brand(
  p_shoot_id uuid,
  p_brand_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'shoot'
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  if p_shoot_id is null or p_brand_id is null then
    return false;
  end if;

  return exists (
    select 1
    from shoot.shoots s
    where s.id = p_shoot_id
      and s.brand_id = p_brand_id
  );
end;
$$;

comment on function public.v2_shoot_owned_by_brand(uuid, uuid) is
  'IPI-1110: true when shoot.shoots row exists for (id, brand_id). JWT required.';

revoke all on function public.v2_shoot_owned_by_brand(uuid, uuid)
  from public, anon;
grant execute on function public.v2_shoot_owned_by_brand(uuid, uuid)
  to authenticated, service_role;

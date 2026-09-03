-- IPI-1110 · CLD-SIGN-001 — expose V2 shoot ownership check to PostgREST.
--
-- shoot.shoots is SQL/RPC-only (not in API schemas). The sign route must not
-- call .schema("shoot"); use this SECURITY DEFINER boolean RPC instead.
-- Caller JWT required. Tenant isolation is enforced inside the function:
-- auth.uid() must be a member of the brand's org (or own a personal brand),
-- and the shoot must belong to that brand.

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

  -- Membership / brand access first — never return true for a foreign brand
  -- even if the (shoot_id, brand_id) pair exists in shoot.shoots.
  return exists (
    select 1
    from shoot.shoots s
    join public.brands b on b.id = s.brand_id
    where s.id = p_shoot_id
      and s.brand_id = p_brand_id
      and b.id = p_brand_id
      and (
        (b.org_id is null and b.user_id = (select auth.uid()))
        or (b.org_id is not null and public.is_org_member(b.org_id))
      )
  );
end;
$$;

comment on function public.v2_shoot_owned_by_brand(uuid, uuid) is
  'IPI-1110: true when auth.uid() can access p_brand_id and shoot.shoots row matches (id, brand_id). JWT + membership required.';

revoke all on function public.v2_shoot_owned_by_brand(uuid, uuid)
  from public, anon;
grant execute on function public.v2_shoot_owned_by_brand(uuid, uuid)
  to authenticated, service_role;

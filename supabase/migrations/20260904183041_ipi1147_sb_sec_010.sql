-- IPI-1147 · SB-SEC-010 — Remove unexpected privileged function access and
-- prove tenant-safe RPCs.
--
-- Purpose (forward-only; do not edit applied history):
--   1) Revoke direct EXECUTE on talent.log_booking_status_change() from
--      PUBLIC / anon / authenticated. It is a SECURITY DEFINER trigger
--      function (trg_bookings_log_status_change on talent.bookings), not a
--      client RPC — the trigger path fires as the table owner regardless of
--      direct EXECUTE grants, so revoking direct EXECUTE does not stop the
--      trigger. service_role keeps EXECUTE for any server-side callers.
--   2) Retarget the 8 campaigns / campaign_deliverables RLS policies from the
--      implicit `public` role (empty polroles = all roles incl. anon) to
--      `authenticated`, preserving the exact existing predicates
--      (is_org_member(...) and the brand-owner / assigned_to checks).
--
-- Does NOT: mass-revoke the 34 authenticated SECURITY DEFINER RPCs; redesign
-- the trigger function; change policy predicates; touch performance/indexes;
-- alter Mastra vendor schema.

-- ---------------------------------------------------------------------------
-- 1) Trigger function direct EXECUTE
-- ---------------------------------------------------------------------------

revoke execute on function talent.log_booking_status_change()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Campaign RLS role targeting: public (implicit) -> authenticated
-- ---------------------------------------------------------------------------

-- campaigns
drop policy if exists campaigns_select_org_member on public.campaigns;
drop policy if exists campaigns_insert_org_member on public.campaigns;
drop policy if exists campaigns_update_org_member on public.campaigns;
drop policy if exists campaigns_delete_org_member on public.campaigns;

create policy campaigns_select_org_member
  on public.campaigns
  for select
  to authenticated
  using (is_org_member(org_id));

create policy campaigns_insert_org_member
  on public.campaigns
  for insert
  to authenticated
  with check (is_org_member(org_id));

create policy campaigns_update_org_member
  on public.campaigns
  for update
  to authenticated
  using (
    is_org_member(org_id)
    and (select auth.uid()) = (select user_id from public.brands where brands.id = campaigns.brand_id)
  )
  with check (
    is_org_member(org_id)
    and (select auth.uid()) = (select user_id from public.brands where brands.id = campaigns.brand_id)
  );

create policy campaigns_delete_org_member
  on public.campaigns
  for delete
  to authenticated
  using (is_org_member(org_id));

-- campaign_deliverables
drop policy if exists campaign_deliverables_select_org_member on public.campaign_deliverables;
drop policy if exists campaign_deliverables_insert_org_member on public.campaign_deliverables;
drop policy if exists campaign_deliverables_update_assigned_or_owner on public.campaign_deliverables;
drop policy if exists campaign_deliverables_delete_org_member on public.campaign_deliverables;

create policy campaign_deliverables_select_org_member
  on public.campaign_deliverables
  for select
  to authenticated
  using (
    is_org_member(
      (select org_id from public.campaigns where campaigns.id = campaign_deliverables.campaign_id)
    )
  );

create policy campaign_deliverables_insert_org_member
  on public.campaign_deliverables
  for insert
  to authenticated
  with check (
    is_org_member(
      (select org_id from public.campaigns where campaigns.id = campaign_deliverables.campaign_id)
    )
  );

create policy campaign_deliverables_update_assigned_or_owner
  on public.campaign_deliverables
  for update
  to authenticated
  using (
    is_org_member(
      (select org_id from public.campaigns where campaigns.id = campaign_deliverables.campaign_id)
    )
  )
  with check (
    (select auth.uid()) = assigned_to
    or (select auth.uid()) = (
      select user_id from public.brands
      where brands.id = (
        select brand_id from public.campaigns
        where campaigns.id = campaign_deliverables.campaign_id
      )
    )
  );

create policy campaign_deliverables_delete_org_member
  on public.campaign_deliverables
  for delete
  to authenticated
  using (
    is_org_member(
      (select org_id from public.campaigns where campaigns.id = campaign_deliverables.campaign_id)
    )
  );
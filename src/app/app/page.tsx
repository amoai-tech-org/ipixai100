import { CommandCenter } from "@/components/dashboard/command-center";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { requireAppWorkspace } from "@/lib/auth/app-shell";
import {
  listMembershipOrgIdsFromServerClient,
  resolveRuntimeTenant,
} from "@/lib/auth/runtime-org";
import {
  loadOrgBrands,
  loadOrgShoots,
  loadTrustedBrandIds,
} from "@/lib/dashboard/command-center";
import { createClient } from "@/lib/supabase/server";

/**
 * DASH-MAIN-001 — the authenticated `/app` Command Center.
 *
 * Trusted org is resolved server-side from AUTH-002 membership rows only
 * (never a client-supplied org id). Brands and Shoots are independent live
 * reads — see command-center.ts for why Shoots goes through
 * shoot_portfolio_view (not raw shoot.shoots). Planner/approvals stay
 * deferred per the accepted scope (honest empty, not a live read).
 *
 * A failed brand or shoot read degrades only its own section, not the
 * whole page — the hero and quick links are static and don't depend on
 * either query, and the two reads don't depend on each other's success.
 */
export default async function AppHomePage() {
  const operator = await requireAppWorkspace();

  const supabase = await createClient();
  if (!supabase) {
    return (
      <div className="p-8">
        <ErrorState message="The workspace is temporarily unavailable. Please try again shortly." />
      </div>
    );
  }

  const tenant = await resolveRuntimeTenant({
    listOrgIds: () => listMembershipOrgIdsFromServerClient(supabase, operator.id),
  });

  if (tenant.status === "needs_onboarding") {
    return (
      <div className="p-8">
        <EmptyState
          heading="No organization yet"
          body="Your account isn't linked to an organization yet. Ask an admin to invite you, or contact support."
        />
      </div>
    );
  }

  if (tenant.status === "needs_org_selection") {
    return (
      <div className="p-8">
        <EmptyState
          heading="Choose an organization"
          body="Your account belongs to more than one organization. Organization switching isn't available on this dashboard yet."
        />
      </div>
    );
  }

  if (tenant.status === "lookup_failed") {
    return (
      <div className="p-8">
        <ErrorState message="Couldn't load your organization. Please try again shortly." />
      </div>
    );
  }

  // Independent reads: brands and the trusted brand-id scope for shoots
  // don't depend on each other, so run them together rather than in series.
  const [brandsResult, trustedBrandIdsResult] = await Promise.all([
    loadOrgBrands(supabase, tenant.orgId),
    loadTrustedBrandIds(supabase, tenant.orgId),
  ]);
  const shootsResult = trustedBrandIdsResult.ok
    ? await loadOrgShoots(supabase, trustedBrandIdsResult.brandIds)
    : ({ ok: false } as const);

  return (
    <div className="p-8">
      <CommandCenter brandsResult={brandsResult} shootsResult={shootsResult} />
    </div>
  );
}

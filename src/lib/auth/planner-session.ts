import { getVerifiedOperatorForRequest } from "@/lib/auth/copilot-hooks";
import {
  listMembershipOrgIdsFromServerClient,
  resolveRuntimeTenant,
  runtimeTenantDenied,
} from "@/lib/auth/runtime-org";
import { unauthorizedResponse } from "@/lib/auth/unauthorized";
import { memoryResourceId } from "@/lib/auth/verified-operator";
import { createClientFromRequest } from "@/lib/supabase/server";

export async function requirePlannerResourceId(request: Request): Promise<
  { ok: true; resourceId: string } | { ok: false; response: Response }
> {
  const operator = await getVerifiedOperatorForRequest(request);
  if (!operator) return { ok: false, response: unauthorizedResponse() };

  const supabase = createClientFromRequest(request);
  if (!supabase) return { ok: false, response: unauthorizedResponse() };

  const tenant = await resolveRuntimeTenant({
    listOrgIds: () =>
      listMembershipOrgIdsFromServerClient(supabase, operator.id),
  });
  if (tenant.status !== "ok") {
    return { ok: false, response: runtimeTenantDenied(tenant) };
  }

  return {
    ok: true,
    resourceId: memoryResourceId({
      userId: operator.id,
      orgId: tenant.orgId,
    }),
  };
}

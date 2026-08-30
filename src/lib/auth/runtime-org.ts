import { forbiddenResponse } from "./unauthorized";

export type RuntimeOrgResolution =
  | { status: "ok"; orgId: string }
  | { status: "needs_onboarding" }
  | { status: "needs_org_selection" };

export type ProductBootstrap = "app" | "onboarding" | "org_selection";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uniqueOrgIds(orgIds: string[]): string[] {
  const seen = new Set<string>();
  for (const id of orgIds) {
    if (!UUID.test(id) || seen.has(id)) continue;
    seen.add(id);
  }
  return [...seen];
}

/** Membership rows only. Client org hints and user_metadata are ignored. */
export function resolveTrustedRuntimeOrg(options: {
  membershipOrgIds: string[];
  clientOrgId?: string | null;
  userMetadataOrgId?: string | null;
}): RuntimeOrgResolution {
  void options.clientOrgId;
  void options.userMetadataOrgId;
  const orgIds = uniqueOrgIds(options.membershipOrgIds);
  if (orgIds.length === 0) return { status: "needs_onboarding" };
  if (orgIds.length > 1) return { status: "needs_org_selection" };
  return { status: "ok", orgId: orgIds[0] };
}

export function productBootstrapFor(
  resolution: RuntimeOrgResolution,
): ProductBootstrap {
  if (resolution.status === "ok") return "app";
  if (resolution.status === "needs_org_selection") return "org_selection";
  return "onboarding";
}

type OrgMembersClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        userId: string,
      ) => PromiseLike<{ data: { org_id: string }[] | null; error: unknown }>;
    };
  };
};

export async function listMembershipOrgIds(
  supabase: OrgMembersClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId);
  if (error || !data) return [];
  return data.map((row) => row.org_id);
}

/** AUTH-002: never pass client orgId / user_metadata into this lookup. */
export async function listMembershipOrgIdsFromServerClient(
  supabase: unknown,
  userId: string,
): Promise<string[]> {
  return listMembershipOrgIds(supabase as OrgMembersClient, userId);
}

export async function resolveRuntimeTenant(options: {
  listOrgIds: () => Promise<string[]>;
}): Promise<RuntimeOrgResolution> {
  return resolveTrustedRuntimeOrg({
    membershipOrgIds: await options.listOrgIds(),
  });
}

export function runtimeForbidden(resolution: Exclude<RuntimeOrgResolution, { status: "ok" }>) {
  return forbiddenResponse(resolution.status);
}

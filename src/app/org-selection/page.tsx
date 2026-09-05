import { redirect } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { requireAppWorkspace } from "@/lib/auth/app-shell";
import { postAuthDestinationFor } from "@/lib/auth/post-auth-destination";
import { listMembershipOrgIdsFromServerClient } from "@/lib/auth/runtime-org";
import { createClient } from "@/lib/supabase/server";

// AUTH-002 org-selection boundary. Multi-org users land here until org
// switching is available; the resolver never guesses an organization.
export default async function OrgSelectionPage() {
  const operator = await requireAppWorkspace();
  const supabase = await createClient();
  if (supabase) {
    const destination = await postAuthDestinationFor({
      operator,
      listOrgIds: () =>
        listMembershipOrgIdsFromServerClient(supabase, operator.id),
    });
    if (destination !== "/org-selection") {
      redirect(destination);
    }
  }
  return (
    <div className="p-8">
      <EmptyState
        heading="Choose an organization"
        body="Your account belongs to more than one organization. Organization switching isn't available yet."
      />
    </div>
  );
}
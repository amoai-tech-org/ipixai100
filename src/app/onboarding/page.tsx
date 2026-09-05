import { redirect } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { requireAppWorkspace } from "@/lib/auth/app-shell";
import { postAuthDestinationFor } from "@/lib/auth/post-auth-destination";
import { listMembershipOrgIdsFromServerClient } from "@/lib/auth/runtime-org";
import { createClient } from "@/lib/supabase/server";

// IPI-1089 · ONBOARD-001 — Let a New iPix User Sign Up, Create Their First
// Brand, and Reach the Operator Workspace owns the full onboarding flow. This
// is the authenticated boundary page so zero-org routing never 404s.
export default async function OnboardingPage() {
  const operator = await requireAppWorkspace();
  const supabase = await createClient();
  if (supabase) {
    const destination = await postAuthDestinationFor({
      operator,
      listOrgIds: () =>
        listMembershipOrgIdsFromServerClient(supabase, operator.id),
    });
    if (destination !== "/onboarding") {
      redirect(destination);
    }
  }
  return (
    <div className="p-8">
      <EmptyState
        heading="Set up your organization"
        body="Your account isn't linked to an organization yet. Onboarding is coming next — create your first brand to get started."
      />
    </div>
  );
}
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { requireAppWorkspace } from "@/lib/auth/app-shell";
import { postAuthDestinationFor } from "@/lib/auth/post-auth-destination";
import { listMembershipOrgIdsFromServerClient } from "@/lib/auth/runtime-org";
import { createClient } from "@/lib/supabase/server";

// IPI-1089 · ONBOARD-001 — Let a New iPix User Sign Up, Create Their First
// Brand, and Reach the Operator Workspace owns the full onboarding flow. This
// is the authenticated boundary page so zero-org routing never 404s. AUTH-002
// membership routing stays server-owned: zero-org renders onboarding, one-org
// redirects to /app, multi-org to /org-selection, lookup failure to /login.
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
    <div className="flex min-h-screen items-center justify-center p-8">
      <OnboardingForm userId={operator.id} />
    </div>
  );
}
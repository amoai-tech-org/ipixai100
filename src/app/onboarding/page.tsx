import { EmptyState } from "@/components/ui/empty-state";
import { requireAppWorkspace } from "@/lib/auth/app-shell";

// IPI-1089 · ONBOARD-001 — Let a New iPix User Sign Up, Create Their First
// Brand, and Reach the Operator Workspace owns the full onboarding flow. This
// is the authenticated boundary page so zero-org routing never 404s.
export default async function OnboardingPage() {
  await requireAppWorkspace();
  return (
    <div className="p-8">
      <EmptyState
        heading="Set up your organization"
        body="Your account isn't linked to an organization yet. Onboarding is coming next — create your first brand to get started."
      />
    </div>
  );
}
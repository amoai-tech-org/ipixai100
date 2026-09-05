import { EmptyState } from "@/components/ui/empty-state";
import { requireAppWorkspace } from "@/lib/auth/app-shell";

// AUTH-002 org-selection boundary. Multi-org users land here until org
// switching is available; the resolver never guesses an organization.
export default async function OrgSelectionPage() {
  await requireAppWorkspace();
  return (
    <div className="p-8">
      <EmptyState
        heading="Choose an organization"
        body="Your account belongs to more than one organization. Organization switching isn't available yet."
      />
    </div>
  );
}
import { EmptyState } from "@/components/ui/empty-state";
import { requireAppWorkspace } from "@/lib/auth/app-shell";

export default async function AppHomePage() {
  await requireAppWorkspace();
  return (
    <div className="p-8">
      <EmptyState
        heading="Command Center"
        body="HOME-001 will fill this slot. The operator shell, navigation, and intelligence rail are already here."
      />
    </div>
  );
}

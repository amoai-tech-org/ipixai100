import { OperatorPanel } from "@/components/operator-panel/operator-panel";
import {
  appWorkspaceDependencies,
  requireResolvedAppWorkspace,
} from "@/lib/auth/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireResolvedAppWorkspace(appWorkspaceDependencies);
  return <OperatorPanel>{children}</OperatorPanel>;
}

import { OperatorPanel } from "@/components/operator-panel/operator-panel";
import { requireAppWorkspace } from "@/lib/auth/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAppWorkspace();
  return <OperatorPanel>{children}</OperatorPanel>;
}

import { canAccessOpsConsole } from "@/lib/env";
import { requireWorkspaceAccess } from "@/lib/workspace-page";

import { DashboardShell } from "./DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, access } = await requireWorkspaceAccess();

  return (
    <DashboardShell
      user={user}
      profile={access.profile}
      canAccessOps={canAccessOpsConsole(user.email)}
    >
      {children}
    </DashboardShell>
  );
}

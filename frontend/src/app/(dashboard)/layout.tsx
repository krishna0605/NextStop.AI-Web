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
    >
      {children}
    </DashboardShell>
  );
}

import { redirect } from "next/navigation";

import { resolveAccessContext } from "@/lib/billing-server";
import { createClient } from "@/lib/supabase-server";

import { DashboardShell } from "./DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const access = await resolveAccessContext(supabase, user);

  if (!access.canAccessDashboard) {
    redirect("/plans?reason=access_required");
  }

  return (
    <DashboardShell
      user={user}
      profile={access.profile}
    >
      {children}
    </DashboardShell>
  );
}

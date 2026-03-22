import { redirect } from "next/navigation";

import { resolveAccessContext } from "@/lib/billing-server";
import { loadWorkspaceOverview } from "@/lib/workspace-server";
import { createClient } from "@/lib/supabase-server";
import { DashboardContent } from "./DashboardContent";

export default async function DashboardPage() {
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

  const overview = await loadWorkspaceOverview(supabase, user);

  return <DashboardContent user={user} profile={access.profile} overview={overview} />;
}

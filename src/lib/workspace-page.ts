import "server-only";

import { notFound, redirect } from "next/navigation";

import { resolveAccessContext } from "@/lib/billing-server";
import { createClient } from "@/lib/supabase-server";
import { loadMeetingDetail, loadWorkspaceOverview } from "./workspace-server";

export async function requireWorkspaceAccess() {
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

  return {
    supabase,
    user,
    access,
  };
}

export async function requireWorkspaceOverview() {
  const context = await requireWorkspaceAccess();
  const overview = await loadWorkspaceOverview(context.supabase, context.user);

  return {
    ...context,
    overview,
  };
}

export async function requireMeetingDetail(meetingId: string) {
  const context = await requireWorkspaceAccess();
  const detail = await loadMeetingDetail(context.supabase, context.user.id, meetingId);

  if (!detail) {
    notFound();
  }

  return {
    ...context,
    detail,
  };
}

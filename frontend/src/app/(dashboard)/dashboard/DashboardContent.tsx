import type { User } from "@supabase/supabase-js";

import { type PlanCode, normalizeAccessState, normalizePlanCode, type ProfileRecord } from "@/lib/billing";
import { getWorkspaceDisplayName } from "@/lib/workspace-server";
import type { WorkspaceOverview as WorkspaceOverviewData } from "@/lib/workspace";
import { WorkspaceOverview } from "@/components/workspace/WorkspaceOverview";

export function DashboardContent({
  user,
  profile,
  overview,
}: {
  user: User;
  profile: ProfileRecord | null;
  overview: WorkspaceOverviewData;
}) {
  const displayName = getWorkspaceDisplayName(user, profile);
  const planCode: PlanCode = normalizePlanCode(profile);
  const accessState = normalizeAccessState(profile, planCode);

  return (
    <WorkspaceOverview
      displayName={displayName}
      email={user.email}
      planCode={planCode}
      accessState={accessState}
      overview={overview}
    />
  );
}

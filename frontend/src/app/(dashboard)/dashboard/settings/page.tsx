import { WorkspaceSettings } from "@/components/workspace/WorkspaceSettings";
import { requireWorkspaceOverview } from "@/lib/workspace-page";

export default async function WorkspaceSettingsPage() {
  const { overview } = await requireWorkspaceOverview();

  return (
    <WorkspaceSettings
      providerStatus={overview.providerStatus}
      google={overview.google}
      notion={overview.notion}
      latestAiJob={overview.latestAiJob}
    />
  );
}

import { NotionWorkspace } from "@/components/workspace/NotionWorkspace";
import { requireWorkspaceOverview } from "@/lib/workspace-page";

export default async function NotionWorkspacePage() {
  const { overview } = await requireWorkspaceOverview();

  return (
    <NotionWorkspace
      record={overview.notion}
      providerConfigured={overview.providerStatus.notionConfigured}
    />
  );
}

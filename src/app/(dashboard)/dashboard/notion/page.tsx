import { IntegrationWorkspace } from "@/components/workspace/IntegrationWorkspace";
import { requireWorkspaceOverview } from "@/lib/workspace-page";

export default async function NotionWorkspacePage() {
  const { overview } = await requireWorkspaceOverview();

  return (
    <IntegrationWorkspace
      provider="notion"
      record={overview.notion}
      providerConfigured={overview.providerStatus.notionConfigured}
    />
  );
}

import { NotionWorkspace } from "@/components/workspace/NotionWorkspace";
import { requireDashboardHomeData } from "@/lib/workspace-page";

export default async function NotionWorkspacePage() {
  const { overview } = await requireDashboardHomeData();

  return (
    <NotionWorkspace
      record={overview.notion}
      providerConfigured={overview.providerStatus.notionConfigured}
    />
  );
}

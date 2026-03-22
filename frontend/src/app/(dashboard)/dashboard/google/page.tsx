import { GoogleWorkspace } from "@/components/workspace/GoogleWorkspace";
import { requireWorkspaceOverview } from "@/lib/workspace-page";

export default async function GoogleWorkspacePage() {
  const { overview } = await requireWorkspaceOverview();

  return <GoogleWorkspace record={overview.google} />;
}

import { GoogleWorkspace } from "@/components/workspace/GoogleWorkspace";
import { requireDashboardHomeData } from "@/lib/workspace-page";

export default async function GoogleWorkspacePage() {
  const { overview } = await requireDashboardHomeData();

  return <GoogleWorkspace record={overview.google} />;
}

import { WorkspaceLibrary } from "@/components/workspace/WorkspaceLibrary";
import { requireWorkspaceOverview } from "@/lib/workspace-page";

export default async function WorkspaceLibraryPage() {
  const { overview } = await requireWorkspaceOverview();

  return <WorkspaceLibrary overview={overview} />;
}

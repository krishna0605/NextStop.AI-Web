import { WorkspaceOps } from "@/components/workspace/WorkspaceOps";
import { requireOpsReadinessData } from "@/lib/workspace-page";

export default async function WorkspaceOpsPage() {
  const { data } = await requireOpsReadinessData();

  return <WorkspaceOps data={data} />;
}

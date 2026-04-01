import { WorkspaceLibrary } from "@/components/workspace/WorkspaceLibrary";
import { requireLibraryPageData } from "@/lib/workspace-page";

export default async function WorkspaceLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cursor?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const parsedLimit = params.limit ? Number(params.limit) : undefined;
  const { data } = await requireLibraryPageData({
    q: params.q,
    cursor: params.cursor ?? null,
    limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
  });

  return <WorkspaceLibrary data={data} />;
}

import { requireDashboardHomeData } from "@/lib/workspace-page";
import { DashboardContent } from "./DashboardContent";

export default async function DashboardPage() {
  const { user, access, overview } = await requireDashboardHomeData();

  return <DashboardContent user={user} profile={access.profile} overview={overview} />;
}

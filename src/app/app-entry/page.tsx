import { redirect } from "next/navigation";

import { sanitizeNextPath } from "@/lib/billing";
import { resolveAccessContext } from "@/lib/billing-server";
import { createClient } from "@/lib/supabase-server";

export default async function AppEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next, "/dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  let canAccessDashboard = false;

  try {
    const access = await resolveAccessContext(supabase, user);
    canAccessDashboard = access.canAccessDashboard;
  } catch (error) {
    console.warn("[billing] Falling back in /app-entry", error);
  }

  if (canAccessDashboard) {
    redirect(nextPath.startsWith("/dashboard") ? nextPath : "/dashboard");
  }

  const plansParams = new URLSearchParams();
  if (nextPath.startsWith("/dashboard")) {
    plansParams.set("next", nextPath);
  }

  redirect(`/plans${plansParams.size ? `?${plansParams.toString()}` : ""}`);
}

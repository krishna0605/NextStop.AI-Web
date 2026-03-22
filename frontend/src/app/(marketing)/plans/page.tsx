import { redirect } from "next/navigation";

import { BillingPlans } from "@/components/BillingPlans";
import type { AccessState, PlanCode } from "@/lib/billing";
import { resolveAccessContext } from "@/lib/billing-server";
import { sanitizeNextPath } from "@/lib/billing";
import { createClient } from "@/lib/supabase-server";

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next, "/dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/plans?next=${encodeURIComponent(nextPath)}`)}`);
  }

  let accessState: AccessState = "no_plan";
  let planCode: PlanCode = "none";
  let trialEndsAt: string | null = null;
  let currentPeriodEnd: string | null = null;
  let fullName: string | null =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    null;

  try {
    const access = await resolveAccessContext(supabase, user);
    accessState = access.accessState;
    planCode = access.planCode;
    trialEndsAt = access.profile?.trial_ends_at ?? null;
    currentPeriodEnd = access.profile?.current_period_end ?? null;
    fullName = access.profile?.full_name ?? fullName;
  } catch (error) {
    console.warn("[billing] Falling back in /plans", error);
  }

  return (
    <BillingPlans
      accessState={accessState}
      planCode={planCode}
      trialEndsAt={trialEndsAt}
      currentPeriodEnd={currentPeriodEnd}
      email={user.email}
      fullName={fullName}
      nextPath={nextPath}
      reason={params.reason ?? null}
    />
  );
}

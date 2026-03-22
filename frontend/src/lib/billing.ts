export type PlanCode = "none" | "pro_trial" | "pro_monthly";

export type AccessState =
  | "no_plan"
  | "trialing"
  | "active"
  | "past_due"
  | "expired"
  | "canceled";

export interface ProfileRecord {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  plan?: string | null;
  plan_code?: string | null;
  access_state?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  subscription_provider?: string | null;
  provider_subscription_id?: string | null;
  subscription_status?: string | null;
  current_period_end?: string | null;
  billing_email?: string | null;
  entitlement_updated_at?: string | null;
}

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  provider: string;
  plan_code: string;
  provider_plan_id?: string | null;
  provider_subscription_id?: string | null;
  provider_payment_id?: string | null;
  status: string;
  is_trial?: boolean | null;
  trial_start_at?: string | null;
  trial_end_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  started_at?: string | null;
  ended_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const PLAN_DETAILS: Record<
  PlanCode,
  {
    label: string;
    priceLabel: string;
    description: string;
  }
> = {
  none: {
    label: "No Plan",
    priceLabel: "",
    description: "Choose a trial or upgrade to unlock the dashboard.",
  },
  pro_trial: {
    label: "Pro Trial",
    priceLabel: "15 days",
    description: "Full Pro access during the 15-day evaluation period.",
  },
  pro_monthly: {
    label: "Pro Workflow",
    priceLabel: "$29/mo",
    description: "Recurring monthly subscription for individual operators.",
  },
};

export function normalizePlanCode(profile: ProfileRecord | null | undefined): PlanCode {
  if (profile?.plan_code === "pro_trial" || profile?.plan_code === "pro_monthly") {
    return profile.plan_code;
  }

  switch (profile?.plan) {
    case "pro":
      return "pro_monthly";
    case "team":
      return "pro_monthly";
    default:
      return "none";
  }
}

export function normalizeAccessState(
  profile: ProfileRecord | null | undefined,
  planCode = normalizePlanCode(profile)
): AccessState {
  if (
    profile?.access_state === "trialing" ||
    profile?.access_state === "active" ||
    profile?.access_state === "past_due" ||
    profile?.access_state === "expired" ||
    profile?.access_state === "canceled"
  ) {
    return profile.access_state;
  }

  return planCode === "pro_monthly" ? "active" : "no_plan";
}

export function hasDashboardAccess(accessState: AccessState): boolean {
  return accessState === "trialing" || accessState === "active";
}

export function sanitizeNextPath(
  nextPath: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return fallback;
  }

  return nextPath;
}

export function getDaysRemaining(dateString: string | null | undefined): number {
  if (!dateString) {
    return 0;
  }

  const target = new Date(dateString).getTime();
  const now = Date.now();

  if (Number.isNaN(target) || target <= now) {
    return 0;
  }

  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function formatDateLabel(dateString: string | null | undefined): string | null {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export const SELF_SERVE_PLAN_CODE: PlanCode = "pro_monthly";


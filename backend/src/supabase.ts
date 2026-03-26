import { createClient } from "@supabase/supabase-js";

export type PlanCode = "none" | "pro_trial" | "pro_monthly";
export type AccessState =
  | "no_plan"
  | "trialing"
  | "active"
  | "past_due"
  | "expired"
  | "canceled";

export type ProfileRecord = {
  id: string;
  full_name?: string | null;
  billing_email?: string | null;
  plan_code?: string | null;
  access_state?: string | null;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  subscription_provider?: string | null;
  provider_subscription_id?: string | null;
  subscription_status?: string | null;
  entitlement_updated_at?: string | null;
};

export type SubscriptionRecord = {
  id: string;
  user_id: string;
  provider: string;
  plan_code: string;
  provider_subscription_id?: string | null;
  status: string;
  trial_end_at?: string | null;
  current_period_end?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function readEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

export function getSupabaseUrl() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "NEXTSTOP_SUPABASE_URL");

  if (!url) {
    throw new Error("Missing Supabase URL.");
  }

  return url;
}

export function getSupabaseAnonKey() {
  const key = readEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
    "NEXTSTOP_SUPABASE_ANON_KEY"
  );

  if (!key) {
    throw new Error("Missing Supabase anon key.");
  }

  return key;
}

export function getSupabaseServiceRoleKey() {
  const key = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!key) {
    throw new Error("Missing Supabase service role key.");
  }

  return key;
}

export function createAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function requireUserFromAuthHeader(authHeader?: string) {
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    throw new Error("Unauthorized");
  }

  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return { user, token };
}

export function normalizePlanCode(profile: ProfileRecord | null | undefined): PlanCode {
  if (profile?.plan_code === "pro_trial" || profile?.plan_code === "pro_monthly") {
    return profile.plan_code;
  }

  return "none";
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

function isPast(dateString: string | null | undefined) {
  if (!dateString) {
    return false;
  }

  const time = new Date(dateString).getTime();
  return !Number.isNaN(time) && time <= Date.now();
}

function deriveFromSubscription(
  subscription: SubscriptionRecord | null
): { planCode: PlanCode; accessState: AccessState; currentPeriodEnd: string | null } | null {
  if (!subscription) {
    return null;
  }

  if (subscription.provider === "internal_trial") {
    if (subscription.status === "trialing" && !isPast(subscription.trial_end_at)) {
      return {
        planCode: "pro_trial",
        accessState: "trialing",
        currentPeriodEnd: subscription.trial_end_at ?? null,
      };
    }

    return {
      planCode: "none",
      accessState: "expired",
      currentPeriodEnd: subscription.trial_end_at ?? null,
    };
  }

  const currentPeriodEnd = subscription.current_period_end ?? null;

  switch (subscription.status) {
    case "active":
    case "authenticated":
      return {
        planCode: "pro_monthly",
        accessState: "active",
        currentPeriodEnd,
      };
    case "halted":
    case "past_due":
    case "payment_failed":
      return {
        planCode: "pro_monthly",
        accessState: "past_due",
        currentPeriodEnd,
      };
    case "cancelled":
    case "canceled":
    case "completed":
      return {
        planCode: isPast(currentPeriodEnd) ? "none" : "pro_monthly",
        accessState: isPast(currentPeriodEnd) ? "expired" : "active",
        currentPeriodEnd,
      };
    default:
      return {
        planCode: "none",
        accessState: "no_plan",
        currentPeriodEnd,
      };
  }
}

export async function resolveBillingSnapshot(userId: string) {
  const admin = createAdminClient();
  const [{ data: profile, error: profileError }, { data: subscription, error: subscriptionError }] =
    await Promise.all([
      admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
      admin
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (profileError) {
    throw profileError;
  }

  if (subscriptionError && subscriptionError.code !== "42P01" && subscriptionError.code !== "PGRST204") {
    throw subscriptionError;
  }

  const typedProfile = (profile as ProfileRecord | null) ?? null;
  const typedSubscription = (subscription as SubscriptionRecord | null) ?? null;
  const derived = deriveFromSubscription(typedSubscription);
  const planCode = derived?.planCode ?? normalizePlanCode(typedProfile);
  const accessState = derived?.accessState ?? normalizeAccessState(typedProfile, planCode);
  const currentPeriodEnd = derived?.currentPeriodEnd ?? typedProfile?.current_period_end ?? null;

  return {
    profile: typedProfile,
    subscription: typedSubscription,
    planCode,
    accessState,
    currentPeriodEnd,
  };
}

export function buildEntitlements(planCode: PlanCode, accessState: AccessState) {
  const paid = planCode !== "none" && (accessState === "active" || accessState === "trialing");
  const state = paid ? "allowed" : "locked";
  const userMessage = paid
    ? "Pro features are active on this account."
    : "Upgrade on the web to unlock Pro features on desktop and web.";

  return {
    plan_code: planCode,
    access_state: accessState,
    feature_flags: {
      ai_analysis: paid,
      notion_export: paid,
      email_export: paid,
      pdf_export: paid,
      meeting_memory: paid,
      advanced_integrations: paid,
    },
    features: {
      ai_analysis: { allowed: paid, state, user_message: userMessage },
      notion_export: { allowed: paid, state, user_message: userMessage },
      email_export: { allowed: paid, state, user_message: userMessage },
      pdf_export: { allowed: paid, state, user_message: userMessage },
      meeting_memory: { allowed: paid, state, user_message: userMessage },
      advanced_integrations: { allowed: paid, state, user_message: userMessage },
    },
  };
}

export function getDisplayName(
  user: { email?: string | null; user_metadata?: Record<string, unknown> | null },
  profile: ProfileRecord | null
) {
  return (
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    null
  );
}

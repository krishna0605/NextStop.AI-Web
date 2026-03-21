import "server-only";

import type { User } from "@supabase/supabase-js";

import type { createClient as createServerClient } from "@/lib/supabase-server";

import {
  type AccessState,
  type PlanCode,
  type ProfileRecord,
  type SubscriptionRecord,
  hasDashboardAccess,
  normalizeAccessState,
  normalizePlanCode,
} from "./billing";
import { createAdminClient } from "./supabase-admin";

type ServerClient = Awaited<ReturnType<typeof createServerClient>>;

export interface AccessContext {
  user: User;
  profile: ProfileRecord | null;
  subscription: SubscriptionRecord | null;
  planCode: PlanCode;
  accessState: AccessState;
  canAccessDashboard: boolean;
}

function getAdminClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

function isSupabaseSchemaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    code?: string | null;
    message?: string | null;
    details?: string | null;
    hint?: string | null;
  };
  const combined = [
    maybeError.code,
    maybeError.message,
    maybeError.details,
    maybeError.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    combined.includes("schema cache") ||
    combined.includes("column") ||
    combined.includes("does not exist") ||
    combined.includes("relation") ||
    maybeError.code === "42P01" ||
    maybeError.code === "42703" ||
    maybeError.code === "PGRST204"
  );
}

function logBillingFallback(label: string, error: unknown) {
  console.warn(`[billing] Falling back in ${label}`, error);
}

async function queryProfile(client: ServerClient | ReturnType<typeof createAdminClient>, userId: string) {
  try {
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as ProfileRecord | null) ?? null;
  } catch (error) {
    if (isSupabaseSchemaError(error)) {
      logBillingFallback("queryProfile", error);
      return null;
    }

    throw error;
  }
}

async function queryLatestSubscription(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  userId: string
) {
  try {
    const { data, error } = await client
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST204") {
        return null;
      }

      throw error;
    }

    return (data as SubscriptionRecord | null) ?? null;
  } catch (error) {
    if (isSupabaseSchemaError(error)) {
      logBillingFallback("queryLatestSubscription", error);
      return null;
    }

    throw error;
  }
}

function getUserProfileSeed(user: User) {
  return {
    id: user.id,
    full_name:
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      null,
    avatar_url:
      user.user_metadata?.avatar_url ??
      user.user_metadata?.picture ??
      null,
    billing_email: user.email ?? null,
  };
}

async function ensureProfileRow(supabase: ServerClient, user: User) {
  const profile = await queryProfile(supabase, user.id);

  if (profile) {
    return profile;
  }

  const admin = getAdminClient();
  const seed = getUserProfileSeed(user);
  const writeClient = admin ?? supabase;
  try {
    const { data, error } = await writeClient
      .from("profiles")
      .upsert({
        ...seed,
        plan_code: "none",
        access_state: "no_plan",
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return (data as ProfileRecord) ?? null;
  } catch (error) {
    if (isSupabaseSchemaError(error)) {
      logBillingFallback("ensureProfileRow", error);
      return profile;
    }

    return profile;
  }
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
        accessState: isPast(currentPeriodEnd) ? "canceled" : "active",
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

async function syncExpiredTrialIfNeeded(
  profile: ProfileRecord | null,
  userId: string
) {
  const planCode = normalizePlanCode(profile);
  const accessState = normalizeAccessState(profile, planCode);

  if (planCode !== "pro_trial" || accessState !== "trialing" || !isPast(profile?.trial_ends_at)) {
    return profile;
  }

  const admin = getAdminClient();

  if (!admin) {
    return {
      ...(profile ?? { id: userId }),
      plan_code: "none",
      access_state: "expired",
      entitlement_updated_at: new Date().toISOString(),
    } as ProfileRecord;
  }

  try {
    await admin
      .from("subscriptions")
      .update({
        status: "expired",
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("provider", "internal_trial")
      .eq("status", "trialing");

    const { data, error } = await admin
      .from("profiles")
      .update({
        plan_code: "none",
        access_state: "expired",
        entitlement_updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return (data as ProfileRecord) ?? profile;
  } catch (error) {
    if (isSupabaseSchemaError(error)) {
      logBillingFallback("syncExpiredTrialIfNeeded", error);
      return {
        ...(profile ?? { id: userId }),
        plan_code: "none",
        access_state: "expired",
      } as ProfileRecord;
    }

    return {
      ...(profile ?? { id: userId }),
      plan_code: "none",
      access_state: "expired",
    } as ProfileRecord;
  }
}

async function syncProfileFromLatestSubscription(
  profile: ProfileRecord | null,
  subscription: SubscriptionRecord | null,
  userId: string
) {
  const derived = deriveFromSubscription(subscription);

  if (!derived) {
    return profile;
  }

  const currentPlan = normalizePlanCode(profile);
  const currentAccess = normalizeAccessState(profile, currentPlan);

  if (
    currentPlan === derived.planCode &&
    currentAccess === derived.accessState &&
    (profile?.current_period_end ?? null) === derived.currentPeriodEnd
  ) {
    return profile;
  }

  const admin = getAdminClient();

  if (!admin) {
    return {
      ...(profile ?? { id: userId }),
      plan_code: derived.planCode,
      access_state: derived.accessState,
      current_period_end: derived.currentPeriodEnd,
      subscription_provider: subscription?.provider ?? null,
      provider_subscription_id: subscription?.provider_subscription_id ?? null,
      subscription_status: subscription?.status ?? null,
      entitlement_updated_at: new Date().toISOString(),
    } as ProfileRecord;
  }

  const payload: Record<string, string | null> = {
    plan_code: derived.planCode,
    access_state: derived.accessState,
    current_period_end: derived.currentPeriodEnd,
    subscription_provider: subscription?.provider ?? null,
    provider_subscription_id: subscription?.provider_subscription_id ?? null,
    subscription_status: subscription?.status ?? null,
    entitlement_updated_at: new Date().toISOString(),
  };

  if (derived.planCode !== "pro_trial" && derived.accessState !== "trialing") {
    payload.trial_ends_at = profile?.trial_ends_at ?? null;
  }

  try {
    const { data, error } = await admin
      .from("profiles")
      .update(payload)
      .eq("id", userId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return (data as ProfileRecord) ?? profile;
  } catch (error) {
    if (isSupabaseSchemaError(error)) {
      logBillingFallback("syncProfileFromLatestSubscription", error);
    }

    return {
      ...(profile ?? { id: userId }),
      ...payload,
    } as ProfileRecord;
  }
}

export async function resolveAccessContext(
  supabase: ServerClient,
  user: User
): Promise<AccessContext> {
  let profile = await ensureProfileRow(supabase, user);
  profile = await syncExpiredTrialIfNeeded(profile, user.id);

  const admin = getAdminClient();
  const subscription = await queryLatestSubscription(admin ?? supabase, user.id);
  profile = await syncProfileFromLatestSubscription(profile, subscription, user.id);

  const planCode = normalizePlanCode(profile);
  const accessState = normalizeAccessState(profile, planCode);

  return {
    user,
    profile,
    subscription,
    planCode,
    accessState,
    canAccessDashboard: hasDashboardAccess(accessState),
  };
}

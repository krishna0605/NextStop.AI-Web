import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { sanitizeNextPath } from "@/lib/billing";
import { internalServerErrorResponse } from "@/lib/http";
import { resolveAccessContext } from "@/lib/billing-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { nextPath?: string };
    const redirectTo = sanitizeNextPath(body.nextPath, "/dashboard");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const access = await resolveAccessContext(supabase, user);

    if (access.canAccessDashboard) {
      return NextResponse.json({ redirectTo });
    }

    if (access.accessState !== "no_plan") {
      return NextResponse.json(
        { error: "This account is not eligible for a new free trial." },
        { status: 409 }
      );
    }

    const admin = createAdminClient();
    const { data: priorTrials, error: priorTrialError } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", "internal_trial")
      .limit(1);

    if (priorTrialError) {
      throw priorTrialError;
    }

    if (priorTrials && priorTrials.length > 0) {
      return NextResponse.json(
        { error: "The free trial has already been used for this account." },
        { status: 409 }
      );
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    const { error: insertError } = await admin.from("subscriptions").insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      provider: "internal_trial",
      plan_code: "pro_trial",
      status: "trialing",
      is_trial: true,
      trial_start_at: now.toISOString(),
      trial_end_at: trialEndsAt.toISOString(),
      started_at: now.toISOString(),
      metadata: {
        source: "plans_page",
      },
    });

    if (insertError) {
      throw insertError;
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        plan_code: "pro_trial",
        access_state: "trialing",
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
        subscription_provider: "internal_trial",
        subscription_status: "trialing",
        current_period_end: trialEndsAt.toISOString(),
        billing_email: user.email ?? null,
        entitlement_updated_at: now.toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      throw profileError;
    }

    return NextResponse.json({ redirectTo });
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to start the free trial.",
      error,
      "[billing] Failed to start free trial"
    );
  }
}

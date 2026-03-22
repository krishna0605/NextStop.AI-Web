import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { type AccessState, SELF_SERVE_PLAN_CODE, sanitizeNextPath } from "@/lib/billing";
import { internalServerErrorResponse } from "@/lib/http";
import { razorpayRequest, toIsoFromUnixSeconds, verifySubscriptionCheckoutSignature } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

interface RazorpaySubscriptionDetails {
  id: string;
  plan_id: string;
  status: string;
  current_start: number | null;
  current_end: number | null;
  charge_at: number | null;
  auth_attempts: number | null;
}

function mapRazorpayStatusToAccessState(
  status: string,
  currentPeriodEnd: string | null
): AccessState {
  switch (status) {
    case "active":
    case "authenticated":
      return "active";
    case "halted":
      return "past_due";
    case "cancelled":
    case "completed":
      if (currentPeriodEnd && new Date(currentPeriodEnd).getTime() > Date.now()) {
        return "active";
      }
      return "canceled";
    default:
      return "no_plan";
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      razorpay_payment_id?: string;
      razorpay_subscription_id?: string;
      razorpay_signature?: string;
      nextPath?: string;
    };
    const nextPath = sanitizeNextPath(body.nextPath, "/dashboard");

    if (
      !body.razorpay_payment_id ||
      !body.razorpay_subscription_id ||
      !body.razorpay_signature
    ) {
      return NextResponse.json({ error: "Missing Razorpay verification payload." }, { status: 400 });
    }

    const isValid = verifySubscriptionCheckoutSignature({
      paymentId: body.razorpay_payment_id,
      subscriptionId: body.razorpay_subscription_id,
      signature: body.razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid Razorpay signature." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const admin = createAdminClient();
    const details = await razorpayRequest<RazorpaySubscriptionDetails>(
      `/subscriptions/${body.razorpay_subscription_id}`,
      {
        method: "GET",
      }
    );

    const currentPeriodStart = toIsoFromUnixSeconds(details.current_start ?? details.charge_at);
    const currentPeriodEnd = toIsoFromUnixSeconds(details.current_end);
    const accessState = mapRazorpayStatusToAccessState(details.status, currentPeriodEnd);
    const now = new Date().toISOString();

    const { error: subscriptionError } = await admin.from("subscriptions").upsert(
      {
        id: crypto.randomUUID(),
        user_id: user.id,
        provider: "razorpay",
        plan_code: SELF_SERVE_PLAN_CODE,
        provider_plan_id: details.plan_id,
        provider_subscription_id: details.id,
        provider_payment_id: body.razorpay_payment_id,
        status: details.status,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        started_at: currentPeriodStart ?? now,
        metadata: {
          verified_at: now,
          auth_attempts: details.auth_attempts,
        },
      },
      {
        onConflict: "provider_subscription_id",
      }
    );

    if (subscriptionError) {
      throw subscriptionError;
    }

    const profilePlanCode = accessState === "active" ? SELF_SERVE_PLAN_CODE : "none";

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        plan_code: profilePlanCode,
        access_state: accessState,
        subscription_provider: "razorpay",
        provider_subscription_id: details.id,
        subscription_status: details.status,
        current_period_end: currentPeriodEnd,
        billing_email: user.email ?? null,
        entitlement_updated_at: now,
      })
      .eq("id", user.id);

    if (profileError) {
      throw profileError;
    }

    return NextResponse.json({
      redirectTo: accessState === "active" ? nextPath : "/plans?reason=verification_pending",
    });
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to verify the Razorpay subscription.",
      error,
      "[billing] Failed to verify Razorpay subscription"
    );
  }
}

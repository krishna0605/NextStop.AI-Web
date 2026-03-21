import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { SELF_SERVE_PLAN_CODE, sanitizeNextPath } from "@/lib/billing";
import { internalServerErrorResponse } from "@/lib/http";
import { resolveAccessContext } from "@/lib/billing-server";
import { razorpayRequest, toIsoFromUnixSeconds } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

interface RazorpaySubscriptionResponse {
  id: string;
  plan_id: string;
  status: string;
  current_start: number | null;
  current_end: number | null;
  charge_at: number | null;
  total_count: number;
  notes?: Record<string, string>;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      plan_code?: string;
      nextPath?: string;
    };
    const nextPath = sanitizeNextPath(body.nextPath, "/dashboard");

    if (body.plan_code !== SELF_SERVE_PLAN_CODE) {
      return NextResponse.json({ error: "Unsupported plan selection." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const access = await resolveAccessContext(supabase, user);

    if (access.accessState === "active" && access.planCode === SELF_SERVE_PLAN_CODE) {
      return NextResponse.json({ error: "This account already has an active Pro subscription." }, { status: 409 });
    }

    const planId = process.env.RAZORPAY_PLAN_ID;
    const publicKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;

    if (!planId || !publicKeyId) {
      return NextResponse.json(
        { error: "Razorpay is not fully configured. Missing plan or key id." },
        { status: 500 }
      );
    }

    const razorpaySubscription = await razorpayRequest<RazorpaySubscriptionResponse>(
      "/subscriptions",
      {
        method: "POST",
        body: JSON.stringify({
          plan_id: planId,
          total_count: 120,
          quantity: 1,
          customer_notify: 1,
          notes: {
            supabase_user_id: user.id,
            plan_code: SELF_SERVE_PLAN_CODE,
          },
        }),
      }
    );

    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { error: insertError } = await admin.from("subscriptions").upsert(
      {
        id: crypto.randomUUID(),
        user_id: user.id,
        provider: "razorpay",
        plan_code: SELF_SERVE_PLAN_CODE,
        provider_plan_id: razorpaySubscription.plan_id,
        provider_subscription_id: razorpaySubscription.id,
        status: razorpaySubscription.status,
        current_period_start: toIsoFromUnixSeconds(
          razorpaySubscription.current_start ?? razorpaySubscription.charge_at
        ),
        current_period_end: toIsoFromUnixSeconds(razorpaySubscription.current_end),
        metadata: {
          source: "plans_page",
          next_path: nextPath,
          notes: razorpaySubscription.notes ?? {},
        },
        started_at: now,
      },
      {
        onConflict: "provider_subscription_id",
      }
    );

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      keyId: publicKeyId,
      subscriptionId: razorpaySubscription.id,
      redirectTo: nextPath,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create the Razorpay subscription.";

    const normalizedMessage = message.toLowerCase();
    const helpfulMessage =
      normalizedMessage.includes("id provided is invalid") ||
      normalizedMessage.includes("could not be found")
        ? "The configured Razorpay plan ID is not available for this account or mode. Create a monthly plan in Razorpay Test Mode and update RAZORPAY_PLAN_ID."
        : message;

    if (helpfulMessage !== message) {
      console.error("[billing] Failed to create Razorpay subscription", {
        message,
      });

      return NextResponse.json(
        {
          error: helpfulMessage,
        },
        { status: 500 }
      );
    }

    return internalServerErrorResponse(
      "Unable to create the Razorpay subscription.",
      error,
      "[billing] Failed to create Razorpay subscription"
    );
  }
}

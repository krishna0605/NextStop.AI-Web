import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { type AccessState, SELF_SERVE_PLAN_CODE } from "@/lib/billing";
import { internalServerErrorResponse } from "@/lib/http";
import { toIsoFromUnixSeconds, verifyWebhookSignature } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

interface RazorpayEntityPayload {
  id?: string;
  status?: string;
  plan_id?: string;
  payment_id?: string;
  current_start?: number | null;
  current_end?: number | null;
  charge_at?: number | null;
  notes?: Record<string, string>;
}

const DEFAULT_WEBHOOK_REPLAY_WINDOW_SECONDS = 10 * 60;

function getWebhookReplayWindowSeconds() {
  const value = Number(process.env.RAZORPAY_WEBHOOK_MAX_EVENT_AGE_SECONDS);

  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_WEBHOOK_REPLAY_WINDOW_SECONDS;
  }

  return value;
}

function getEventCreatedAt(payload: Record<string, unknown>) {
  const value = payload.created_at;

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function isStaleWebhookEvent(payload: Record<string, unknown>) {
  const createdAt = getEventCreatedAt(payload);

  if (!createdAt) {
    return false;
  }

  const eventAgeSeconds = Date.now() / 1000 - createdAt;

  return eventAgeSeconds > getWebhookReplayWindowSeconds();
}

function mapWebhookStatusToAccessState(
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

function getSubscriptionEntity(payload: Record<string, unknown>): RazorpayEntityPayload {
  const subscriptionEntity =
    (payload?.payload as { subscription?: { entity?: RazorpayEntityPayload } } | undefined)
      ?.subscription?.entity;
  const paymentEntity =
    (payload?.payload as { payment?: { entity?: RazorpayEntityPayload } } | undefined)?.payment
      ?.entity;

  if (subscriptionEntity?.id) {
    return subscriptionEntity;
  }

  return {
    id: paymentEntity?.id,
    status: paymentEntity?.status,
    payment_id: paymentEntity?.id,
    notes: paymentEntity?.notes,
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing webhook signature." }, { status: 400 });
  }

  try {
    const valid = verifyWebhookSignature(rawBody, signature);

    if (!valid) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;

    if (isStaleWebhookEvent(payload)) {
      return NextResponse.json({ error: "Stale webhook event." }, { status: 400 });
    }

    const eventType = String(payload.event ?? "unknown");
    const eventId =
      request.headers.get("x-razorpay-event-id") ??
      crypto
        .createHash("sha1")
        .update(`${eventType}:${rawBody}`)
        .digest("hex");

    const admin = createAdminClient();

    const { data: existingEvent } = await admin
      .from("billing_events")
      .select("id, processed_at")
      .eq("provider_event_id", eventId)
      .maybeSingle();

    if (existingEvent?.processed_at) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const entity = getSubscriptionEntity(payload);
    const providerSubscriptionId =
      entity.id && entity.id.startsWith("sub_") ? entity.id : null;
    const userIdFromNotes = entity.notes?.supabase_user_id ?? null;

    const currentPeriodStart = toIsoFromUnixSeconds(entity.current_start ?? entity.charge_at);
    const currentPeriodEnd = toIsoFromUnixSeconds(entity.current_end);
    const subscriptionStatus = entity.status ?? eventType;
    const accessState = mapWebhookStatusToAccessState(subscriptionStatus, currentPeriodEnd);
    const planCode = accessState === "active" ? SELF_SERVE_PLAN_CODE : "none";

    const { error: billingEventError } = await admin.from("billing_events").upsert(
      {
        provider: "razorpay",
        provider_event_id: eventId,
        event_type: eventType,
        user_id: userIdFromNotes,
        provider_subscription_id: providerSubscriptionId,
        payload,
        processed_at: new Date().toISOString(),
        processing_error: null,
      },
      {
        onConflict: "provider_event_id",
      }
    );

    if (billingEventError) {
      throw billingEventError;
    }

    if (providerSubscriptionId && userIdFromNotes) {
      const { error: subscriptionError } = await admin.from("subscriptions").upsert(
        {
          id: crypto.randomUUID(),
          user_id: userIdFromNotes,
          provider: "razorpay",
          plan_code: SELF_SERVE_PLAN_CODE,
          provider_plan_id: entity.plan_id ?? process.env.RAZORPAY_PLAN_ID ?? null,
          provider_subscription_id: providerSubscriptionId,
          provider_payment_id: entity.payment_id ?? null,
          status: subscriptionStatus,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          started_at: currentPeriodStart ?? new Date().toISOString(),
          metadata: payload,
        },
        {
          onConflict: "provider_subscription_id",
        }
      );

      if (subscriptionError) {
        throw subscriptionError;
      }

      const { error: profileError } = await admin
        .from("profiles")
        .update({
          plan_code: planCode,
          access_state: accessState,
          subscription_provider: "razorpay",
          provider_subscription_id: providerSubscriptionId,
          subscription_status: subscriptionStatus,
          current_period_end: currentPeriodEnd,
          entitlement_updated_at: new Date().toISOString(),
        })
        .eq("id", userIdFromNotes);

      if (profileError) {
        throw profileError;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to process the Razorpay webhook.",
      error,
      "[billing] Failed to process Razorpay webhook"
    );
  }
}

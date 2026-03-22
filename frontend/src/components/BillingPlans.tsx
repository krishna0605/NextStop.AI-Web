"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Clock3, Crown, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { resolvePublicApiUrl } from "@/lib/public-backend";
import {
  type AccessState,
  type PlanCode,
  PLAN_DETAILS,
  SELF_SERVE_PLAN_CODE,
  formatDateLabel,
  getDaysRemaining,
  hasDashboardAccess,
} from "@/lib/billing";

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string;
      subscription_id: string;
      name: string;
      description: string;
      handler: (response: {
        razorpay_payment_id: string;
        razorpay_subscription_id: string;
        razorpay_signature: string;
      }) => void;
      prefill?: {
        email?: string;
        name?: string;
      };
      theme?: {
        color?: string;
      };
      modal?: {
        ondismiss?: () => void;
      };
    }) => { open: () => void };
  }
}

const planCards = [
  {
    code: "pro_trial" as PlanCode,
    eyebrow: "Start free",
    title: "15-day Pro Trial",
    price: "Free for 15 days",
    description:
      "Get the full Pro workflow before you commit. This is the only free access path in the gated app.",
    features: [
      "Full Pro dashboard access",
      "Meeting review and diagnostics",
      "Targeted regeneration and exports",
      "Shared Supabase entitlement across web, desktop, and mobile",
    ],
  },
  {
    code: "pro_monthly" as PlanCode,
    eyebrow: "Self-serve",
    title: "Pro Workflow",
    price: "$29 / month",
    description:
      "Recurring monthly access for individual operators who need the full meeting workflow.",
    features: [
      "Everything in the trial",
      "Recurring monthly entitlement via Razorpay",
      "Billing and access synced to the same Supabase user",
      "Dashboard stays unlocked while subscription is active",
    ],
  },
  {
    code: "none" as PlanCode,
    eyebrow: "Contact sales",
    title: "Team",
    price: "Custom",
    description:
      "For team-wide rollout, managed onboarding, and non-self-serve billing.",
    features: [
      "Team rollout and onboarding",
      "Shared defaults and support",
      "Custom billing discussion",
      "Contact sales instead of in-app checkout",
    ],
  },
];

function loadRazorpayCheckout() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function BillingPlans({
  accessState,
  planCode,
  trialEndsAt,
  currentPeriodEnd,
  email,
  fullName,
  nextPath = "/dashboard",
  reason,
}: {
  accessState: AccessState;
  planCode: PlanCode;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  email?: string | null;
  fullName?: string | null;
  nextPath?: string;
  reason?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"trial" | "pro" | null>(null);

  const hasAccess = hasDashboardAccess(accessState);
  const trialDaysRemaining = getDaysRemaining(trialEndsAt);
  const trialEndsLabel = formatDateLabel(trialEndsAt);
  const currentPeriodEndLabel = formatDateLabel(currentPeriodEnd);

  async function startTrial() {
    setLoadingAction("trial");
    setError(null);

    try {
      const response = await fetch(resolvePublicApiUrl("/api/billing/trial/start"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nextPath,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to start the free trial.");
      }

      router.push(payload.redirectTo ?? nextPath);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to start the free trial."
      );
      setLoadingAction(null);
    }
  }

  async function startProCheckout() {
    setLoadingAction("pro");
    setError(null);

    try {
      const response = await fetch(resolvePublicApiUrl("/api/billing/subscriptions/create"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_code: SELF_SERVE_PLAN_CODE,
          nextPath,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create the subscription.");
      }

      const loaded = await loadRazorpayCheckout();

      if (!loaded || !window.Razorpay) {
        throw new Error("Failed to load Razorpay Checkout.");
      }

      const checkout = new window.Razorpay({
        key: payload.keyId,
        subscription_id: payload.subscriptionId,
        name: "NextStop.ai",
        description: "Pro Workflow monthly subscription",
        prefill: {
          email: email ?? undefined,
          name: fullName ?? undefined,
        },
        theme: {
          color: "#f28145",
        },
        handler: async (checkoutResponse) => {
          const verifyResponse = await fetch(
            resolvePublicApiUrl("/api/billing/subscriptions/verify"),
            {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...checkoutResponse,
              nextPath,
            }),
            }
          );

          const verifyPayload = await verifyResponse.json();

          if (!verifyResponse.ok) {
            setError(verifyPayload.error ?? "Subscription verification failed.");
            setLoadingAction(null);
            return;
          }

          router.push(verifyPayload.redirectTo ?? nextPath);
          router.refresh();
        },
        modal: {
          ondismiss: () => {
            setLoadingAction(null);
          },
        },
      });

      checkout.open();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to start the checkout flow."
      );
      setLoadingAction(null);
    }
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden px-4 pb-20 pt-32 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mb-10 max-w-3xl text-center"
        >
          <div className="brand-chip mb-6 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium">
            <Sparkles className="mr-2 h-4 w-4" />
            Billing Gate
          </div>
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            Choose how you want to unlock <span className="brand-gradient-text">NextStop.ai</span>
          </h1>
          <p className="text-lg text-zinc-400">
            Authentication gets the user into the account. Billing entitlement decides
            whether they continue into the dashboard or stay on plans.
          </p>
        </motion.div>

        {(reason || error || accessState === "trialing" || accessState === "active") && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-8 max-w-4xl rounded-3xl border border-white/10 bg-zinc-950/80 p-5"
          >
            <div className="flex flex-col gap-3 text-sm text-zinc-300 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-white">
                  {accessState === "trialing"
                    ? `${PLAN_DETAILS.pro_trial.label} is active`
                    : accessState === "active"
                      ? `${PLAN_DETAILS.pro_monthly.label} is active`
                      : "Dashboard access is gated by plan status"}
                </p>
                <p className="mt-1 text-zinc-400">
                  {!error && accessState === "trialing" && trialEndsLabel
                    ? `Your free trial ends on ${trialEndsLabel} (${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} left).`
                    : !error && accessState === "active" && currentPeriodEndLabel
                      ? `Your current billing period is active through ${currentPeriodEndLabel}.`
                      : !error && reason === "access_required"
                        ? "This account needs an active trial or paid subscription before the dashboard becomes available."
                        : error}
                </p>
              </div>
              {hasAccess && (
                <Link href={nextPath} className="shrink-0">
                  <Button
                    radius="full"
                    className="brand-button-primary h-11 px-6 font-semibold"
                    endContent={<ArrowRight className="h-4 w-4" />}
                  >
                    Continue to dashboard
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-8 max-w-4xl rounded-3xl border border-red-500/25 bg-red-500/10 p-5"
          >
            <p className="text-sm font-semibold text-red-200">Upgrade to Pro could not start</p>
            <p className="mt-1 text-sm text-red-100/90">{error}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {planCards.map((plan, index) => {
            const isCurrent =
              (plan.code === "pro_trial" && accessState === "trialing") ||
              (plan.code === "pro_monthly" && accessState === "active" && planCode === "pro_monthly");
            const isTrialCard = plan.code === "pro_trial";
            const isProCard = plan.code === "pro_monthly";

            return (
              <motion.div
                key={plan.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`relative overflow-hidden rounded-3xl border p-8 ${
                  isProCard
                    ? "border-[rgb(var(--brand-primary-rgb)/0.22)] bg-zinc-950/92 shadow-[0_0_40px_-15px_rgba(242,129,69,0.24)]"
                    : "border-white/10 bg-zinc-950/90"
                }`}
              >
                {isProCard && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(135deg, rgb(var(--brand-primary-rgb) / 0.18), transparent 40%, rgb(var(--brand-trust-rgb) / 0.12))",
                    }}
                  />
                )}

                <div className="relative z-10">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    {plan.eyebrow}
                  </p>
                  <h2 className="mb-2 text-2xl font-bold text-white">{plan.title}</h2>
                  <p className="mb-2 text-3xl font-extrabold text-white">{plan.price}</p>
                  <p className="mb-6 text-sm leading-relaxed text-zinc-400">{plan.description}</p>

                  <div className="mb-6 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={{ color: "var(--brand-primary)" }}
                        />
                        <span className="text-sm text-zinc-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {isCurrent && (
                    <div className="mb-6 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                      {accessState === "trialing" ? "Currently active trial" : "Currently active subscription"}
                    </div>
                  )}

                  {isTrialCard ? (
                    <Button
                      radius="full"
                      isDisabled={accessState !== "no_plan"}
                      isLoading={loadingAction === "trial"}
                      onPress={startTrial}
                      className="brand-button-secondary h-11 w-full font-semibold"
                      startContent={<Clock3 className="h-4 w-4" />}
                    >
                      {accessState === "no_plan" ? "Start free" : "Trial unavailable"}
                    </Button>
                  ) : null}

                  {isProCard ? (
                    <Button
                      radius="full"
                      isLoading={loadingAction === "pro"}
                      onPress={startProCheckout}
                      className="brand-button-primary h-11 w-full font-semibold"
                      startContent={<Crown className="h-4 w-4" />}
                    >
                      {accessState === "active" ? "Reactivate / manage plan" : "Upgrade to Pro"}
                    </Button>
                  ) : null}

                  {!isTrialCard && !isProCard ? (
                    <Button
                      as={Link}
                      href="mailto:hello@nextstop.ai?subject=NextStop.ai%20Team%20Plan"
                      radius="full"
                      className="brand-button-secondary h-11 w-full font-semibold"
                    >
                      Contact sales
                    </Button>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

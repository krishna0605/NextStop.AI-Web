"use client";

import { Button, Tab, Tabs } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import { BillingTrust } from "@/components/BillingTrust";
import { pricingPlans } from "@/lib/pricing-plans";
import { createClient } from "@/lib/supabase-browser";

export function Pricing() {
  const [isYearly, setIsYearly] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  function handlePlanCta(planName: string) {
    if (planName === "Starter") {
      const path = "/plans?intent=trial";
      router.push(user ? path : `/signup?next=${encodeURIComponent(path)}`);
      return;
    }

    if (planName === "Pro Workflow") {
      const path = "/plans?intent=pro";
      router.push(user ? path : `/login?next=${encodeURIComponent(path)}`);
      return;
    }

    window.open("mailto:hello@nextstop.ai?subject=NextStop.ai%20Team%20Plan", "_self");
  }

  return (
    <section id="pricing" className="relative bg-transparent py-14">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="font-heading mb-4 text-4xl font-semibold tracking-[-0.02em] text-white md:text-5xl">
            Choose the workflow that fits your team
          </h2>
          <p className="mb-8 text-lg text-zinc-400">
            Start with local capture and review, then scale into post-meeting
            AI, workspace sync, and operator controls.
          </p>

          <div className="mb-8 flex justify-center">
            <Tabs
              aria-label="Billing Options"
              selectedKey={isYearly ? "yearly" : "monthly"}
              onSelectionChange={(key) => setIsYearly(key === "yearly")}
              color="secondary"
              radius="full"
              classNames={{
                tabList: "brand-tab-list",
                cursor: "brand-tab-cursor",
                tab: "h-10 px-6",
                tabContent:
                  "font-medium text-zinc-400 group-data-[selected=true]:text-black",
              }}
            >
              <Tab key="monthly" title="Monthly" />
              <Tab
                key="yearly"
                title={
                  <div className="flex items-center space-x-2">
                    <span>Yearly</span>
                    <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400">
                      Save 20%
                    </span>
                  </div>
                }
              />
            </Tabs>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`group relative flex h-full flex-col rounded-3xl ${
                !plan.popular
                  ? "brand-card-hover"
                  : "shadow-[0_0_40px_-15px_rgba(242,129,69,0.24)] md:-mt-4 md:mb-4"
              }`}
              style={
                !plan.popular
                  ? ({ "--card-accent-rgb": "242 129 69" } as React.CSSProperties)
                  : undefined
              }
            >
              <div
                className={`relative flex h-full w-full flex-col overflow-hidden rounded-3xl ${
                  !plan.popular ? "border border-white/10 bg-zinc-950/92 p-8" : ""
                }`}
              >
                {plan.popular && (
                  <>
                    <div className="pointer-events-none absolute inset-0 bg-zinc-900/84"></div>
                    <div
                      className="absolute inset-0 z-0 opacity-90"
                      style={{
                        background:
                          "linear-gradient(135deg, rgb(var(--brand-primary-rgb) / 0.3), rgb(var(--brand-highlight-rgb) / 0.12) 45%, rgb(var(--brand-trust-rgb) / 0.24))",
                      }}
                    ></div>
                    <div className="pointer-events-none absolute inset-[1px] z-0 rounded-[calc(1.5rem-1px)] bg-zinc-950/96"></div>
                  </>
                )}

                <div
                  className={`relative z-10 flex h-full w-full flex-col ${
                    plan.popular ? "border border-white/8 p-8" : ""
                  }`}
                  style={
                    plan.popular
                      ? ({
                          borderColor: "rgb(var(--brand-primary-rgb) / 0.18)",
                          background:
                            "linear-gradient(180deg, rgb(255 255 255 / 0.03), rgb(255 255 255 / 0.01))",
                        } as React.CSSProperties)
                      : undefined
                  }
                >

                <div className="flex h-full flex-1 flex-col">
                  <div className="flex flex-col items-start pb-6">
                    <h3 className="mb-2 text-xl font-semibold text-white">{plan.name}</h3>
                    <p className="min-h-0 text-sm text-zinc-400">{plan.description}</p>
                    <div className="mt-5 flex items-baseline text-white">
                      <span className="text-4xl font-extrabold tracking-tight">$</span>
                      <RollingPrice value={isYearly ? plan.yearlyPrice : plan.monthlyPrice} />
                      <span className="ml-1 font-medium text-zinc-500">/mo</span>
                    </div>
                  </div>

                  <div className="py-2">
                    <ul className="space-y-4 text-sm text-zinc-300">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex gap-3">
                          <Check
                            className="h-5 w-5 shrink-0"
                            style={{ color: "var(--brand-primary)" }}
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {plan.limitations.map((limitation, i) => (
                        <li key={i} className="flex gap-3 text-zinc-500">
                          <X className="h-5 w-5 shrink-0 text-zinc-600" />
                          <span>{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 flex justify-center">
                    <Button
                      onPress={() => handlePlanCta(plan.name)}
                      radius="full"
                      className={`h-10 min-w-[168px] px-8 font-semibold ${
                        plan.popular ? "brand-button-primary" : "brand-button-secondary"
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </div>

                  <div className="mt-5">
                    <BillingTrust notes={plan.trustNotes} compact />
                  </div>
                </div>
              </div>
              </div>

              {plan.popular && (
                <div className="absolute left-1/2 -top-4 z-40 -translate-x-1/2">
                  <div
                    className="inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-black shadow-lg"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, var(--brand-primary), var(--brand-highlight))",
                    }}
                  >
                    Most Popular
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RollingPrice({ value }: { value: number }) {
  const digits = value.toString().split("");

  return (
    <span className="flex overflow-hidden text-4xl font-extrabold tracking-tight">
      <AnimatePresence mode="popLayout">
        {digits.map((digit, index) => (
          <motion.span
            key={`${index}-${digit}`}
            initial={{ y: "100%", opacity: 0, filter: "blur(4px)" }}
            animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
            exit={{ y: "-100%", opacity: 0, filter: "blur(4px)" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="inline-block"
          >
            {digit}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}

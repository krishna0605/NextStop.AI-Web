"use client";

import { Button, Tab, Tabs } from "@heroui/react";
import { motion } from "framer-motion";
import { Check, X, ArrowRight } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase-browser";
import { BillingTrust } from "@/components/BillingTrust";
import { Footer } from "@/components/Footer";
import { RollingPrice } from "@/components/Pricing";
import { pricingFaqs, pricingFeatureMatrix, pricingPlans } from "@/lib/pricing-plans";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export default function PricingPage() {
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
    <>
      <main className="min-h-screen w-full overflow-x-hidden pt-28">
        {/* Hero */}
        <section className="relative py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-heading mb-6 text-4xl font-bold tracking-tight text-white md:text-6xl"
              >
                Choose the workflow that fits{" "}
                <span className="brand-gradient-text text-shimmer">your team</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="mb-10 text-xl leading-relaxed text-zinc-400"
              >
                Start with local capture and review, then scale into post-meeting AI,
                workspace sync, and operator controls.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="mb-8 flex justify-center"
              >
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
              </motion.div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-24">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3"
            >
              {pricingPlans.map((plan) => (
                <motion.div
                  key={plan.name}
                  variants={fadeUp}
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
                        <div className="pointer-events-none absolute inset-0 bg-zinc-900/84" />
                        <div
                          className="absolute inset-0 z-0 opacity-90"
                          style={{
                            background:
                              "linear-gradient(135deg, rgb(var(--brand-primary-rgb) / 0.3), rgb(var(--brand-highlight-rgb) / 0.12) 45%, rgb(var(--brand-trust-rgb) / 0.24))",
                          }}
                        />
                        <div className="pointer-events-none absolute inset-[1px] z-0 rounded-[calc(1.5rem-1px)] bg-zinc-950/96" />
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
                            className={`h-10 min-w-[168px] px-8 font-semibold button-shine ${
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
            </motion.div>
          </div>
        </section>

        {/* Feature Comparison Matrix */}
        <section className="border-t border-white/5 py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-4xl">
              <h2 className="font-heading mb-4 text-center text-3xl font-bold text-white md:text-4xl">
                Full feature comparison
              </h2>
              <p className="mb-12 text-center text-lg text-zinc-400">
                See exactly what&rsquo;s included in each plan.
              </p>

              <div className="hover-border-gradient overflow-hidden rounded-2xl border border-white/8">
                {/* Header */}
                <div className="grid grid-cols-4 border-b border-white/8 bg-zinc-900/60">
                  <div className="px-6 py-4 text-sm font-medium text-zinc-500">Feature</div>
                  <div className="px-6 py-4 text-center text-sm font-medium text-zinc-400">Starter</div>
                  <div className="px-6 py-4 text-center">
                    <span
                      className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-black"
                      style={{
                        backgroundImage:
                          "linear-gradient(135deg, var(--brand-primary), var(--brand-highlight))",
                      }}
                    >
                      Pro
                    </span>
                  </div>
                  <div className="px-6 py-4 text-center text-sm font-medium text-zinc-400">Team</div>
                </div>

                {/* Rows */}
                {pricingFeatureMatrix.map((row) => (
                  <div
                    key={row.feature}
                    className="grid grid-cols-4 border-b border-white/5 transition-colors last:border-none hover:bg-white/[0.02]"
                  >
                    <div className="px-6 py-4 text-sm text-zinc-300">{row.feature}</div>
                    {[row.starter, row.pro, row.team].map((val, i) => (
                      <div key={i} className="flex items-center justify-center px-6 py-4">
                        {val ? (
                          <Check className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
                        ) : (
                          <X className="h-4 w-4 text-zinc-700" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing FAQ */}
        <section className="border-t border-white/5 py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl">
              <h2 className="font-heading mb-12 text-center text-3xl font-bold text-white md:text-4xl">
                Pricing questions
              </h2>
              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="space-y-6"
              >
                {pricingFaqs.map((faq) => (
                  <motion.div
                    key={faq.q}
                    variants={fadeUp}
                    className="hover-border-gradient rounded-2xl border border-white/8 bg-zinc-950/60 p-6"
                  >
                    <h3 className="font-heading mb-2 text-lg font-bold text-white text-hover-brand cursor-default">
                      {faq.q}
                    </h3>
                    <p className="leading-relaxed text-zinc-400">{faq.a}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-white/5 py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading mb-6 text-3xl font-bold text-white md:text-4xl">
                Start with Starter. Upgrade when you&rsquo;re ready.
              </h2>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  radius="full"
                  className="brand-button-primary button-shine h-12 px-8 font-semibold"
                  onPress={() => handlePlanCta("Starter")}
                >
                  Start for Free
                </Button>
                <Link href="/security">
                  <Button
                    size="lg"
                    variant="bordered"
                    radius="full"
                    className="brand-button-secondary button-shine h-12 px-8 font-semibold"
                    endContent={<ArrowRight className="h-4 w-4" />}
                  >
                    Trust & Security
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}

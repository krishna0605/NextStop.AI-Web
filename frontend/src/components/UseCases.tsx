"use client";

import { motion } from "framer-motion";
import { CalendarRange, FileCheck2, Mic } from "lucide-react";
import React from "react";

const lifecycleSteps = [
  {
    id: "before",
    title: "Before the meeting",
    eyebrow: "Structured start",
    icon: <CalendarRange className="h-5 w-5" />,
    description:
      "Set the meeting mode, title, tag, and destination up front so the session begins with context instead of cleanup.",
    summary: "Launch with the right structure in one pass.",
  },
  {
    id: "during",
    title: "During the meeting",
    eyebrow: "Local capture",
    icon: <Mic className="h-5 w-5" />,
    description:
      "Capture locally with stable participant identity so the transcript and review flow stay grounded in the same meeting reality.",
    summary: "Keep the live session trustworthy and readable.",
  },
  {
    id: "after",
    title: "After the meeting",
    eyebrow: "Approved follow-up",
    icon: <FileCheck2 className="h-5 w-5" />,
    description:
      "Review one canonical package, generate summaries and tasks, then sync the approved result into the workspace without rebuilding it by hand.",
    summary: "Move from review to action with one durable artifact.",
  },
];

export function UseCases() {
  return (
    <section className="relative overflow-hidden bg-transparent py-14">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="brand-chip mb-6 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium"
            >
              Built for the full meeting lifecycle
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-heading mb-5 text-3xl font-semibold tracking-[-0.02em] text-white md:text-5xl"
            >
              One clean flow from session setup to verified follow-up
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8 max-w-2xl text-lg leading-relaxed text-zinc-400"
            >
              NextStop gives product, engineering, and operations teams a
              shorter path through the meeting lifecycle without turning the
              homepage into documentation.
            </motion.p>

            <div className="flex flex-wrap gap-3">
              {["Product teams", "Engineering leaders", "Ops workflows"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {lifecycleSteps.map((step, index) => (
              <motion.article
                key={step.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="brand-card-hover rounded-[1.75rem] border border-white/10 bg-black/25 p-6 shadow-[0_24px_64px_-44px_rgba(0,0,0,0.9)]"
                style={{ "--card-accent-rgb": "242 129 69" } as React.CSSProperties}
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[var(--brand-highlight)]">
                      {step.icon}
                    </div>
                    <div>
                      <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                        {step.eyebrow}
                      </p>
                      <h3 className="font-heading text-2xl font-semibold text-white">
                        {step.title}
                      </h3>
                    </div>
                  </div>

                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                    0{index + 1}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_0.8fr] md:items-start">
                  <p className="text-base leading-relaxed text-zinc-300">
                    {step.description}
                  </p>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400">
                    {step.summary}
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

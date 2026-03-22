"use client";

import { motion } from "framer-motion";
import { SlidersHorizontal, Sparkles, Workflow } from "lucide-react";
import React from "react";

export function ModesComparison() {
  return (
    <section className="relative overflow-hidden border-t border-white/5 bg-transparent py-24">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 text-3xl font-bold text-white md:text-5xl"
          >
            Keep it simple or open the full operator view
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg text-zinc-400"
          >
            NextStop is designed for both guided daily use and deeper meeting
            control. Simple mode keeps the workflow approachable. Advanced mode
            exposes the richer review and regeneration surface when teams need it.
          </motion.p>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
          <ModeCard
            title="Simple mode"
            subtitle="Included in Starter"
            description="Use a guided session flow, clean review surface, and straightforward export path when the goal is speed and clarity."
            tone="trust"
            icon={<Sparkles className="h-5 w-5" />}
            bullets={[
              "guided start session flow",
              "clean meeting review surface",
              "fewer controls, faster decisions",
            ]}
            chips={["quick start", "simple review", "low-friction sync"]}
            previewRows={[
              "Start Session",
              "Short summary",
              "Sync to Notion",
            ]}
          />

          <ModeCard
            title="Advanced mode"
            subtitle="Unlocked on Pro"
            description="Expose the deeper operator layer with AI status, targeted regeneration, memory context, and richer review controls across the meeting lifecycle."
            tone="warm"
            icon={<Workflow className="h-5 w-5" />}
            bullets={[
              "AI status rail and stage history",
              "targeted summary, task, and draft reruns",
              "memory context and export control surfaces",
            ]}
            chips={["advanced toggle", "artifact controls", "operator diagnostics"]}
            previewRows={[
              "Status rail  Cached  Cost",
              "Regenerate Summary  Tasks  Draft",
              "Memory context  Export actions",
            ]}
            badge="Pro"
          />
        </div>

        <div className="mx-auto mt-8 max-w-4xl rounded-3xl border border-white/8 bg-zinc-950/60 p-5">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{
                  background: "rgb(var(--brand-primary-rgb) / 0.14)",
                  color: "var(--brand-highlight)",
                }}
              >
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Advanced mode is part of the Pro workflow
                </p>
                <p className="text-sm text-zinc-400">
                  Starter keeps the experience guided. Pro adds the advanced
                  toggle for deeper meeting operations and review controls.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Starter: Simple", "Pro: Simple + Advanced", "Team: Advanced for all seats"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs font-medium text-zinc-300"
                  >
                    {item}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ModeCard({
  title,
  subtitle,
  description,
  tone,
  icon,
  bullets,
  chips,
  previewRows,
  badge,
}: {
  title: string;
  subtitle: string;
  description: string;
  tone: "warm" | "trust";
  icon: React.ReactNode;
  bullets: string[];
  chips: string[];
  previewRows: string[];
  badge?: string;
}) {
  const surfaceRgb = tone === "warm" ? "242 129 69" : "80 103 184";
  const iconBg =
    tone === "warm"
      ? "rgb(var(--brand-primary-rgb) / 0.16)"
      : "rgb(var(--brand-trust-rgb) / 0.16)";
  const iconColor = tone === "warm" ? "var(--brand-primary)" : "var(--brand-trust)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-90px" }}
      className="brand-surface-card rounded-[1.75rem]"
      style={{ "--surface-rgb": surfaceRgb } as React.CSSProperties}
    >
      <div className="brand-surface-frame rounded-[1.75rem] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: iconBg, color: iconColor }}
          >
            {icon}
          </div>
          <div className="flex items-center gap-2">
            {badge ? (
              <span
                className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-black"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, var(--brand-primary), var(--brand-highlight))",
                }}
              >
                {badge}
              </span>
            ) : null}
            <span className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
              {subtitle}
            </span>
          </div>
        </div>

        <h3 className="mb-3 text-2xl font-bold text-white">{title}</h3>
        <p className="mb-6 text-sm leading-relaxed text-zinc-400">{description}</p>

        <div className="mb-6 space-y-3">
          {bullets.map((bullet) => (
            <div key={bullet} className="flex items-start gap-3">
              <span
                className="mt-2 h-2 w-2 rounded-full"
                style={{
                  background:
                    tone === "warm"
                      ? "rgb(var(--brand-primary-rgb) / 0.24)"
                      : "rgb(var(--brand-trust-rgb) / 0.24)",
                }}
              />
              <p className="text-sm text-zinc-300">{bullet}</p>
            </div>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="brand-surface-chip rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs font-medium text-zinc-300"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="brand-surface-grid rounded-2xl border border-white/8 p-4">
          <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-zinc-500">
            Surface preview
          </p>
          <div className="space-y-3">
            {previewRows.map((row, index) => (
              <div
                key={row}
                className="brand-surface-chip rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-300"
                style={{
                  opacity: badge && index === 2 ? 1 : undefined,
                }}
              >
                {row}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

"use client";

import {
  Cpu,
  Ear,
  LayoutTemplate,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import React from "react";
import { CurvedConnector, MobileConnector } from "./CurvedConnector";

const features = [
  {
    icon: <Cpu className="h-8 w-8" style={{ color: "var(--brand-primary)" }} />,
    title: "Local Rust Session Engine",
    description:
      "The desktop engine handles capture, buffering, and speaker-aware packaging locally before the secure post-meeting AI pipeline begins.",
    accent: "var(--brand-primary)",
    accentRgb: "var(--brand-primary-rgb)",
    gradient:
      "radial-gradient(ellipse at 30% 40%, rgb(var(--brand-primary-rgb) / 0.12), transparent 70%)",
    detail: (
      <div className="mt-5 flex flex-wrap gap-2">
        {["Local capture", "Speaker resolve", "Meeting package"].map((step, i) => (
          <React.Fragment key={step}>
            {i > 0 && (
              <span className="flex items-center text-zinc-600">→</span>
            )}
            <span
              className="rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: "rgb(var(--brand-primary-rgb) / 0.25)",
                background: "rgb(var(--brand-primary-rgb) / 0.08)",
                color: "var(--brand-highlight)",
              }}
            >
              {step}
            </span>
          </React.Fragment>
        ))}
      </div>
    ),
  },
  {
    icon: <Ear className="h-8 w-8" style={{ color: "var(--brand-support)" }} />,
    title: "Participant Identity",
    description:
      "Meeting-scoped attribution keeps remote speakers separated, supports rename flows, and keeps review, history, and exports consistent.",
    accent: "var(--brand-support)",
    accentRgb: "var(--brand-support-rgb)",
    gradient:
      "radial-gradient(ellipse at 70% 40%, rgb(var(--brand-support-rgb) / 0.12), transparent 70%)",
    detail: (
      <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.02] p-4">
        <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-zinc-500">
          Resolved transcript
        </p>
        <div className="space-y-2">
          {[
            { speaker: "You", text: "Let's lock the rollout window before Friday.", color: "var(--brand-trust)" },
            { speaker: "Ravi", text: "I will update the checklist and follow up with Support.", color: "var(--brand-primary)" },
            { speaker: "Maya", text: "Good, keep the same labels in Notion and the final summary.", color: "var(--brand-support)" },
          ].map((line) => (
            <div key={line.speaker} className="flex items-start gap-3">
              <span
                className="mt-0.5 inline-flex min-w-[3.5rem] justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white"
                style={{ background: `color-mix(in srgb, ${line.color} 28%, transparent)` }}
              >
                {line.speaker}
              </span>
              <p className="text-sm text-zinc-400">{line.text}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: <ShieldCheck className="h-8 w-8" style={{ color: "var(--brand-trust)" }} />,
    title: "Secure Gateway Boundary",
    description:
      "Your production AI keys stay server-side only. The desktop app sends finalized meeting packages and receives structured artifacts back for review.",
    accent: "var(--brand-trust)",
    accentRgb: "var(--brand-trust-rgb)",
    gradient:
      "radial-gradient(ellipse at 30% 40%, rgb(var(--brand-trust-rgb) / 0.12), transparent 70%)",
    detail: (
      <div className="mt-5 flex items-center gap-3 text-xs text-zinc-500">
        <span className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-1.5">Desktop app</span>
        <span className="h-px w-6" style={{ background: "linear-gradient(to right, rgb(var(--brand-primary-rgb) / 0.6), rgb(var(--brand-trust-rgb) / 0.6))" }} />
        <span
          className="rounded-lg border px-3 py-1.5 font-medium"
          style={{
            borderColor: "rgb(var(--brand-trust-rgb) / 0.3)",
            background: "rgb(var(--brand-trust-rgb) / 0.1)",
            color: "var(--brand-highlight)",
          }}
        >
          Secure gateway
        </span>
        <span className="h-px w-6" style={{ background: "linear-gradient(to right, rgb(var(--brand-trust-rgb) / 0.6), rgb(var(--brand-support-rgb) / 0.6))" }} />
        <span className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-1.5">Structured outputs</span>
      </div>
    ),
  },
  {
    icon: <LayoutTemplate className="h-8 w-8" style={{ color: "var(--brand-support)" }} />,
    title: "Canonical Meeting Artifact",
    badge: "New",
    description:
      "Every processed meeting can produce one reusable markdown artifact that powers preview, retry, Notion sync, and future exports.",
    accent: "var(--brand-support)",
    accentRgb: "var(--brand-support-rgb)",
    gradient:
      "radial-gradient(ellipse at 70% 40%, rgb(var(--brand-highlight-rgb) / 0.1), transparent 70%)",
    detail: (
      <div className="mt-5 rounded-xl border border-white/8 bg-zinc-950 p-4">
        <div className="mb-2 flex gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-white/5 bg-zinc-800 text-[10px] text-zinc-400">
            MD
          </div>
          <div className="flex h-7 flex-1 items-center rounded-md border border-white/5 bg-zinc-800/50 px-3 text-[11px] text-zinc-500">
            meeting-2026-03-14-release-sync.md
          </div>
        </div>
        <div className="rounded-md border border-white/5 bg-zinc-900 p-3 font-mono text-xs leading-relaxed text-zinc-600">
          <span style={{ color: "var(--brand-primary)" }}># Release readiness</span>
          <br />
          - Decision: shift rollout to Friday
          <br />
          - Action: update launch checklist
          <br />
          - Follow-up: sync Support and Security
        </div>
      </div>
    ),
  },
];

// Connector directions: between block 0→1: LTR, 1→2: RTL, 2→3: LTR
const connectorDirections: Array<"left-to-right" | "right-to-left"> = [
  "left-to-right",
  "right-to-left",
  "left-to-right",
];

export function Features() {
  return (
    <section id="features" className="relative w-full overflow-hidden bg-transparent py-24">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        {/* Section header */}
        <div className="mx-auto mb-20 max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="brand-chip mb-6 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Built for Meeting Operators
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl"
          >
            One desktop flow from{" "}
            <span className="brand-gradient-text">launch to export</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg text-zinc-400"
          >
            NextStop combines local session control, participant-aware capture,
            secure post-meeting AI, and workspace-ready exports in a single
            desktop workflow.
          </motion.p>
        </div>

        {/* Zigzag snake-flow layout */}
        <div className="mx-auto flex max-w-6xl flex-col">
          {features.map((feature, index) => {
            const isEven = index % 2 === 0;

            return (
              <React.Fragment key={feature.title}>
                <motion.div
                  initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6, type: "spring", bounce: 0.25 }}
                  className={`group relative flex flex-col items-center gap-8 md:flex-row ${
                    !isEven ? "md:flex-row-reverse" : ""
                  }`}
                >


                  {/* Text column */}
                  <div className="relative z-10 flex-1 space-y-4">
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900 shadow-lg"
                      style={{ boxShadow: `0 0 32px -20px ${feature.accent}` }}
                    >
                      {feature.icon}
                    </div>
                    <h3 className="font-heading text-3xl font-bold tracking-tight text-white">
                      <span className="mr-2 text-zinc-600">0{index + 1}.</span>
                      {feature.title}
                      {"badge" in feature && feature.badge && (
                        <span className="brand-chip ml-3 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider align-middle">
                          {feature.badge}
                        </span>
                      )}
                    </h3>
                    <p className="max-w-md text-lg leading-relaxed text-zinc-400">
                      {feature.description}
                    </p>
                  </div>

                  {/* Detail column */}
                  <div className="relative z-10 w-full max-w-[480px] flex-1">
                    <div className="rounded-2xl border border-white/8 bg-zinc-950/60 p-6 transition-all duration-300 group-hover:border-white/12 group-hover:shadow-[0_0_40px_-20px_rgba(232,169,88,0.15)]">
                      {feature.detail}
                    </div>
                  </div>
                </motion.div>

                {/* Curved connector arrow between blocks */}
                {index < features.length - 1 && (
                  <>
                    <CurvedConnector direction={connectorDirections[index]} />
                    <MobileConnector />
                  </>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}

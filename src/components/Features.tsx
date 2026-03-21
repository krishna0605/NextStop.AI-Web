"use client";

import {
  ArrowRight,
  Cpu,
  Ear,
  LayoutTemplate,
  Rocket,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import React from "react";

import { GlowingMouseCard } from "./ui/GlowingMouseCard";

export function Features() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 10,
      },
    },
  };

  return (
    <section id="features" className="relative w-full overflow-hidden bg-transparent py-24">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
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
            className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl"
          >
            One desktop flow from <span className="brand-gradient-text">launch to export</span>
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

        <motion.div
          className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div variants={itemVariants} className="md:col-span-2">
            <GlowingMouseCard className="h-full" tone="warm">
              <div className="p-6">
                <Cpu
                  className="mb-6 h-10 w-10"
                  style={{ color: "var(--brand-primary)" }}
                />
                <h3 className="mb-2 text-2xl font-bold text-white">
                  Local Rust Session Engine
                </h3>
                <p className="max-w-md text-zinc-400">
                  The desktop engine handles capture, buffering, and
                  speaker-aware packaging locally before the secure
                  post-meeting AI pipeline begins.
                </p>
              </div>
              <div className="relative mt-auto overflow-hidden border-t border-white/5 bg-black px-6 py-7">
                <div
                  className="absolute inset-x-0 bottom-0 h-24"
                  style={{
                    background:
                      "linear-gradient(to top, rgb(var(--brand-primary-rgb) / 0.18), transparent)",
                  }}
                />
                <div className="relative mx-auto flex max-w-xl flex-col gap-4">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                    <span className="w-1/3 text-center">Local capture</span>
                    <span className="w-1/3 text-center">Speaker resolve</span>
                    <span className="w-1/3 text-center">Meeting package</span>
                  </div>

                  <div className="grid grid-cols-3 items-start justify-items-center gap-0">
                    <FeatureNode
                      icon={<Cpu className="h-4 w-4" />}
                      label="Capture"
                      tone="warm"
                      showArrow
                    />
                    <FeatureNode
                      icon={<Zap className="h-4 w-4" />}
                      label="Resolve"
                      tone="support"
                      showArrow
                    />
                    <FeatureNode
                      icon={<Rocket className="h-4 w-4" />}
                      label="Package"
                      tone="trust"
                    />
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400">
                    The desktop engine prepares the finalized meeting package
                    locally, then hands it to the gateway only after recording
                    ends.
                  </div>
                </div>
              </div>
            </GlowingMouseCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlowingMouseCard className="h-full" tone="warm">
              <div className="flex h-full flex-col p-6">
                <Ear
                  className="mb-6 h-10 w-10"
                  style={{ color: "var(--brand-support)" }}
                />
                <h3 className="mb-2 text-xl font-bold text-white">
                  Participant Identity
                </h3>
                <p className="text-sm text-zinc-400">
                  Meeting-scoped attribution keeps remote speakers separated,
                  supports rename flows, and keeps review, history, and exports
                  consistent.
                </p>

                <div className="mt-8 flex flex-1 flex-col gap-4 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <IdentityPill
                      name="You"
                      detail="Owner microphone"
                      tone="trust"
                    />
                    <IdentityPill
                      name="Ravi"
                      detail="Renamed from Speaker 2"
                      tone="warm"
                    />
                    <IdentityPill
                      name="Maya"
                      detail="Remote participant"
                      tone="support"
                    />
                    <IdentityPill
                      name="Stable IDs"
                      detail="Review + export aligned"
                      tone="trust"
                    />
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                      Resolved transcript
                    </p>
                    <div className="space-y-3">
                      <IdentityTranscriptLine
                        speaker="You"
                        text="Let's lock the rollout window before Friday."
                        tone="trust"
                      />
                      <IdentityTranscriptLine
                        speaker="Ravi"
                        text="I will update the checklist and follow up with Support."
                        tone="warm"
                      />
                      <IdentityTranscriptLine
                        speaker="Maya"
                        text="Good, keep the same labels in Notion and the final summary."
                        tone="support"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </GlowingMouseCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlowingMouseCard className="h-full" tone="trust">
              <div className="p-6">
                <ShieldCheck
                  className="mb-6 h-10 w-10"
                  style={{ color: "var(--brand-trust)" }}
                />
                <h3 className="mb-2 text-xl font-bold text-white">
                  Secure Gateway Boundary
                </h3>
                <p className="text-sm text-zinc-400">
                  Your production AI keys stay server-side only. The desktop app
                  sends finalized meeting packages and receives structured
                  artifacts back for review.
                </p>
              </div>
            </GlowingMouseCard>
          </motion.div>

          <motion.div variants={itemVariants} className="md:col-span-2">
            <GlowingMouseCard className="h-full" tone="warm">
              <div className="flex h-full flex-col items-center gap-8 p-6 md:flex-row">
                <div className="flex-1">
                  <LayoutTemplate
                    className="mb-4 h-10 w-10"
                    style={{ color: "var(--brand-support)" }}
                  />
                  <h3 className="mb-2 flex items-center gap-2 text-2xl font-bold text-white">
                    Canonical Meeting Artifact
                    <span className="brand-chip rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wider">
                      New
                    </span>
                  </h3>
                  <p className="text-zinc-400">
                    Every processed meeting can produce one reusable markdown
                    artifact that powers preview, retry, Notion sync, and
                    future exports.
                  </p>
                </div>

                <div
                  className="brand-card-hover relative flex w-full flex-1 cursor-default flex-col gap-3 overflow-hidden rounded-xl border border-white/5 bg-black p-4 shadow-inner"
                  style={{ "--card-accent-rgb": "232 169 88" } as React.CSSProperties}
                >
                  <div
                    className="absolute right-0 top-0 h-28 w-28 rounded-full blur-2xl"
                    style={{ background: "rgb(var(--brand-highlight-rgb) / 0.06)" }}
                  />
                  <div className="mb-2 flex gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-white/5 bg-zinc-800 text-xs text-zinc-400">
                      MD
                    </div>
                    <div className="flex h-8 flex-1 items-center rounded-md border border-white/5 bg-zinc-800/50 px-3 text-xs text-zinc-500">
                      meeting-2026-03-14-release-sync.md
                    </div>
                  </div>
                  <div className="h-24 w-full rounded-md border border-white/5 bg-zinc-900 p-3 text-left font-mono text-xs leading-relaxed text-zinc-600 opacity-80">
                    <span style={{ color: "var(--brand-primary)" }}>
                      # Release readiness
                    </span>
                    <br />
                    - Decision: shift rollout to Friday
                    <br />
                    - Action: update launch checklist
                    <br />
                    - Follow-up: sync Support and Security
                  </div>
                </div>
              </div>
            </GlowingMouseCard>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function FeatureNode({
  icon,
  label,
  tone,
  showArrow = false,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "warm" | "support" | "trust";
  showArrow?: boolean;
}) {
  const toneStyles = {
    warm: {
      borderColor: "rgb(var(--brand-primary-rgb) / 0.3)",
      background:
        "linear-gradient(135deg, rgb(var(--brand-primary-rgb) / 0.16), rgb(var(--brand-highlight-rgb) / 0.08))",
      color: "var(--brand-primary)",
    },
    support: {
      borderColor: "rgb(var(--brand-support-rgb) / 0.32)",
      background:
        "linear-gradient(135deg, rgb(var(--brand-support-rgb) / 0.16), rgb(var(--brand-highlight-rgb) / 0.06))",
      color: "var(--brand-highlight)",
    },
    trust: {
      borderColor: "rgb(var(--brand-trust-rgb) / 0.32)",
      background:
        "linear-gradient(135deg, rgb(var(--brand-trust-rgb) / 0.16), rgb(var(--brand-highlight-rgb) / 0.05))",
      color: "var(--brand-trust)",
    },
  } as const;

  return (
    <div className="relative z-10 flex w-full flex-col items-center gap-3 text-center">
      <div className="relative flex w-full justify-center">
        <div
          className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border shadow-[0_12px_28px_-22px_rgba(0,0,0,0.9)]"
          style={toneStyles[tone]}
        >
          {icon}
        </div>
        {showArrow ? (
          <div
            className="pointer-events-none absolute left-[calc(50%+1.75rem)] top-1/2 hidden h-5 -translate-y-1/2 items-center md:flex"
            style={{ width: "calc(100% - 3.75rem)" }}
          >
            <div className="relative h-full flex-1">
              <span
                className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
                style={{
                  background:
                    "linear-gradient(to right, rgb(var(--brand-primary-rgb) / 0.8), rgb(var(--brand-highlight-rgb) / 0.95))",
                }}
              />
              <motion.span
                className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
                style={{
                  background: "var(--brand-highlight)",
                  boxShadow:
                    "0 0 12px rgb(var(--brand-highlight-rgb) / 0.95), 0 0 24px rgb(var(--brand-primary-rgb) / 0.45)",
                }}
                animate={{ left: ["0%", "calc(100% - 0.625rem)"] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </div>
            <ArrowRight
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: "var(--brand-highlight)" }}
            />
          </div>
        ) : null}
      </div>
      <span className="w-full text-xs font-medium text-zinc-300">{label}</span>
    </div>
  );
}

function IdentityPill({
  name,
  detail,
  tone,
}: {
  name: string;
  detail: string;
  tone: "warm" | "support" | "trust";
}) {
  const toneStyles = {
    warm: {
      borderColor: "rgb(var(--brand-primary-rgb) / 0.24)",
      background:
        "linear-gradient(135deg, rgb(var(--brand-primary-rgb) / 0.14), rgb(var(--brand-highlight-rgb) / 0.05))",
      dot: "var(--brand-primary)",
    },
    support: {
      borderColor: "rgb(var(--brand-support-rgb) / 0.24)",
      background:
        "linear-gradient(135deg, rgb(var(--brand-support-rgb) / 0.14), rgb(var(--brand-highlight-rgb) / 0.05))",
      dot: "var(--brand-highlight)",
    },
    trust: {
      borderColor: "rgb(var(--brand-trust-rgb) / 0.24)",
      background:
        "linear-gradient(135deg, rgb(var(--brand-trust-rgb) / 0.14), rgb(var(--brand-highlight-rgb) / 0.05))",
      dot: "var(--brand-trust)",
    },
  } as const;

  return (
    <div
      className="rounded-xl border px-3 py-3"
      style={{
        borderColor: toneStyles[tone].borderColor,
        background: toneStyles[tone].background,
      }}
    >
      <div className="mb-1 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: toneStyles[tone].dot }}
        />
        <span className="text-sm font-semibold text-white">{name}</span>
      </div>
      <p className="text-xs leading-relaxed text-zinc-400">{detail}</p>
    </div>
  );
}

function IdentityTranscriptLine({
  speaker,
  text,
  tone,
}: {
  speaker: string;
  text: string;
  tone: "warm" | "support" | "trust";
}) {
  const toneStyles = {
    warm: "rgb(var(--brand-primary-rgb) / 0.22)",
    support: "rgb(var(--brand-support-rgb) / 0.22)",
    trust: "rgb(var(--brand-trust-rgb) / 0.22)",
  } as const;

  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-0.5 inline-flex min-w-[4.25rem] justify-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white"
        style={{ background: toneStyles[tone] }}
      >
        {speaker}
      </span>
      <p className="text-sm leading-relaxed text-zinc-400">{text}</p>
    </div>
  );
}

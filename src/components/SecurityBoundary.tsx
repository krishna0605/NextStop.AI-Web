"use client";

import { motion } from "framer-motion";
import { ArrowRight, CloudOff, FileText, Lock, Server, ShieldCheck } from "lucide-react";
import React from "react";

type BoundaryTone = "warm" | "support" | "trust";

const columns: Array<{
  title: string;
  eyebrow: string;
  description: string;
  icon: React.ReactNode;
  tone: BoundaryTone;
  chips: string[];
}> = [
  {
    title: "On your laptop",
    eyebrow: "Local zone",
    description:
      "Session launch, recording, transcript history, speaker identity, and in-meeting controls stay grounded in the desktop runtime.",
    icon: <CloudOff className="h-5 w-5" />,
    tone: "warm",
    chips: ["audio capture", "dynamic HUD", "participant labels"],
  },
  {
    title: "Secure gateway",
    eyebrow: "Trust boundary",
    description:
      "When the meeting ends, the finalized meeting package can be sent to the gateway for extraction, synthesis, memory, and controlled regeneration.",
    icon: <ShieldCheck className="h-5 w-5" />,
    tone: "trust",
    chips: ["server-side keys", "post-meeting only", "policy-controlled AI"],
  },
  {
    title: "Structured outputs",
    eyebrow: "Return path",
    description:
      "The app gets artifacts back for review, exports, canonical markdown, Notion sync, and follow-up workflows without exposing the production key.",
    icon: <FileText className="h-5 w-5" />,
    tone: "support",
    chips: ["summary bundle", "retryable exports", "workspace sync"],
  },
];

const surfaceRgb: Record<BoundaryTone, string> = {
  warm: "242 129 69",
  support: "232 169 88",
  trust: "80 103 184",
};

const iconTone: Record<BoundaryTone, { bg: string; color: string }> = {
  warm: {
    bg: "rgb(var(--brand-primary-rgb) / 0.16)",
    color: "var(--brand-primary)",
  },
  support: {
    bg: "rgb(var(--brand-support-rgb) / 0.16)",
    color: "var(--brand-highlight)",
  },
  trust: {
    bg: "rgb(var(--brand-trust-rgb) / 0.16)",
    color: "var(--brand-trust)",
  },
};

export function SecurityBoundary() {
  return (
    <section className="relative overflow-hidden border-t border-white/5 bg-transparent py-24">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="brand-chip-trust mb-6 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium"
          >
            <Lock className="mr-2 h-4 w-4" />
            Security Boundary
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 text-3xl font-bold text-white md:text-5xl"
          >
            A trust model users can understand
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg text-zinc-400"
          >
            The site should make the boundary explicit: local capture happens on
            the desktop, the secure gateway owns the production AI key, and the
            app brings structured artifacts back into review and export.
          </motion.p>
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="pointer-events-none absolute left-[17%] right-[17%] top-24 hidden items-center justify-between md:flex">
            <div className="brand-surface-line flex-1" />
            <ArrowRight className="mx-3 h-4 w-4 text-[var(--brand-highlight)]" />
            <div className="brand-surface-line flex-1" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {columns.map((column, index) => (
              <motion.div
                key={column.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-90px" }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="brand-surface-card rounded-[1.75rem]"
                style={{ "--surface-rgb": surfaceRgb[column.tone] } as React.CSSProperties}
              >
                <div className="brand-surface-frame rounded-[1.75rem] p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                      {column.eyebrow}
                    </span>
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-2xl"
                      style={{
                        background: iconTone[column.tone].bg,
                        color: iconTone[column.tone].color,
                      }}
                    >
                      {column.icon}
                    </div>
                  </div>

                  <h3 className="mb-3 text-2xl font-bold text-white">{column.title}</h3>
                  <p className="mb-6 text-sm leading-relaxed text-zinc-400">
                    {column.description}
                  </p>

                  <div className="mb-6 flex flex-wrap gap-2">
                    {column.chips.map((chip) => (
                      <span
                        key={chip}
                        className="brand-surface-chip rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs font-medium text-zinc-300"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/28 p-4">
                    {column.tone === "warm" ? (
                      <div className="space-y-3">
                        <BoundaryRow label="Mic / system audio" value="Local only" />
                        <BoundaryRow label="Transcript history" value="Stored on desktop" />
                        <BoundaryRow label="Session controls" value="HUD + review" />
                      </div>
                    ) : null}

                    {column.tone === "trust" ? (
                      <div className="space-y-3">
                        <BoundaryRow label="OpenAI key" value="Server-held" />
                        <BoundaryRow label="Run timing" value="After meeting end" />
                        <BoundaryRow label="Policy" value="Summary, tasks, memory" />
                      </div>
                    ) : null}

                    {column.tone === "support" ? (
                      <div className="space-y-3">
                        <BoundaryRow label="Review" value="Artifacts applied locally" />
                        <BoundaryRow label="Exports" value="Markdown + Notion routes" />
                        <BoundaryRow label="Recovery" value="Targeted regeneration" />
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <TrustPill
              icon={<CloudOff className="h-4 w-4" />}
              text="Live meeting audio does not stream directly to OpenAI."
            />
            <TrustPill
              icon={<Server className="h-4 w-4" />}
              text="The secure gateway owns production AI credentials and policy."
            />
            <TrustPill
              icon={<FileText className="h-4 w-4" />}
              text="The desktop app receives structured outputs back for review and sync."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function BoundaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-xs font-medium text-zinc-200">{value}</span>
    </div>
  );
}

function TrustPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="brand-card-hover flex items-start gap-3 rounded-2xl border border-white/8 bg-zinc-950/60 px-4 py-4">
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{
          background: "rgb(var(--brand-trust-rgb) / 0.14)",
          color: "var(--brand-highlight)",
        }}
      >
        {icon}
      </div>
      <p className="text-sm leading-relaxed text-zinc-400">{text}</p>
    </div>
  );
}

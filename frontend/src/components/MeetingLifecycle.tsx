"use client";

import { motion } from "framer-motion";
import { CalendarRange, FileText, Mic } from "lucide-react";
import React from "react";

type LifecycleTone = "warm" | "support" | "trust";

const stages: Array<{
  title: string;
  phase: string;
  description: string;
  icon: React.ReactNode;
  tone: LifecycleTone;
  bullets: string[];
  previewLabel: string;
  previewRows: string[];
}> = [
  {
    title: "Before the meeting",
    phase: "01",
    description:
      "Start with intention instead of recording first and organizing later. Users can choose the session type, title, tags, destination, and sync defaults up front.",
    icon: <CalendarRange className="h-5 w-5" />,
    tone: "warm",
    bullets: [
      "Start Session launcher",
      "Google Meet or existing meeting path",
      "Tag and Notion destination selection",
    ],
    previewLabel: "Session setup",
    previewRows: [
      "Type: Instant Google Meet",
      "Tag: Engineering",
      "Auto-sync after finish",
    ],
  },
  {
    title: "During the session",
    phase: "02",
    description:
      "Capture stays local while the desktop HUD keeps the meeting controllable. Participant identity, highlights, notes, and actions stay attached to the active session.",
    icon: <Mic className="h-5 w-5" />,
    tone: "support",
    bullets: [
      "Local recording and transcript history",
      "Dynamic island controls and quick notes",
      "Stable participant identity in review",
    ],
    previewLabel: "Live controls",
    previewRows: [
      "Recording  00:24:18",
      "Highlight  Action  Note",
      "Participants resolved",
    ],
  },
  {
    title: "After the meeting",
    phase: "03",
    description:
      "The finalized meeting package flows into review, post-meeting AI, memory, and export surfaces so users can finish the follow-up without rebuilding the meeting context.",
    icon: <FileText className="h-5 w-5" />,
    tone: "trust",
    bullets: [
      "AI status rail and summary artifacts",
      "Targeted regeneration and memory reuse",
      "Markdown, Notion, and export-ready outputs",
    ],
    previewLabel: "Review output",
    previewRows: [
      "Summary ready",
      "Tasks: 4  Decisions: 3",
      "Memory context: 2 related meetings",
    ],
  },
];

const surfaceRgb: Record<LifecycleTone, string> = {
  warm: "242 129 69",
  support: "232 169 88",
  trust: "80 103 184",
};

const surfaceStyles: Record<
  LifecycleTone,
  { iconBg: string; iconColor: string; bullet: string }
> = {
  warm: {
    iconBg: "rgb(var(--brand-primary-rgb) / 0.16)",
    iconColor: "var(--brand-primary)",
    bullet: "rgb(var(--brand-primary-rgb) / 0.2)",
  },
  support: {
    iconBg: "rgb(var(--brand-support-rgb) / 0.16)",
    iconColor: "var(--brand-highlight)",
    bullet: "rgb(var(--brand-support-rgb) / 0.18)",
  },
  trust: {
    iconBg: "rgb(var(--brand-trust-rgb) / 0.16)",
    iconColor: "var(--brand-trust)",
    bullet: "rgb(var(--brand-trust-rgb) / 0.2)",
  },
};

export function MeetingLifecycle() {
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
            Before, during, and after the meeting
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg text-zinc-400"
          >
            This is the product loop users move through: guided setup, local
            capture, then a review and export surface that finishes the real
            follow-up work.
          </motion.p>
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="pointer-events-none absolute left-[18%] right-[18%] top-24 hidden items-center md:flex">
            <div className="brand-surface-line flex-1" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {stages.map((stage, index) => (
              <motion.div
                key={stage.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-90px" }}
                transition={{ duration: 0.45, delay: index * 0.07 }}
                className="brand-surface-card rounded-[1.75rem]"
                style={{ "--surface-rgb": surfaceRgb[stage.tone] } as React.CSSProperties}
              >
                <div className="brand-surface-frame rounded-[1.75rem] p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{
                        background: surfaceStyles[stage.tone].iconBg,
                        color: surfaceStyles[stage.tone].iconColor,
                      }}
                    >
                      {stage.icon}
                    </div>
                    <span className="brand-surface-chip rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs font-semibold tracking-[0.22em] text-zinc-400">
                      {stage.phase}
                    </span>
                  </div>

                  <h3 className="mb-3 text-2xl font-bold text-white">{stage.title}</h3>
                  <p className="mb-6 text-sm leading-relaxed text-zinc-400">
                    {stage.description}
                  </p>

                  <div className="mb-6 space-y-3">
                    {stage.bullets.map((bullet) => (
                      <div key={bullet} className="flex items-start gap-3">
                        <span
                          className="mt-2 h-2 w-2 rounded-full"
                          style={{ background: surfaceStyles[stage.tone].bullet }}
                        />
                        <p className="text-sm text-zinc-300">{bullet}</p>
                      </div>
                    ))}
                  </div>

                  <div className="brand-surface-grid rounded-2xl border border-white/8 p-4">
                    <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                      {stage.previewLabel}
                    </p>
                    <div className="space-y-3">
                      {stage.previewRows.map((row) => (
                        <div
                          key={row}
                          className="brand-surface-chip rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300"
                        >
                          {row}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

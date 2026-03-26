"use client";

import { motion } from "framer-motion";
import { CalendarRange, FileText, Mic } from "lucide-react";
import React from "react";
import { CurvedConnector, MobileConnector } from "./CurvedConnector";

const stages = [
  {
    title: "Before the meeting",
    phase: "01",
    description:
      "Start with intention instead of recording first and organizing later. Users can choose the session type, title, tags, destination, and sync defaults up front.",
    icon: <CalendarRange className="h-8 w-8" style={{ color: "var(--brand-primary)" }} />,
    accent: "var(--brand-primary)",
    gradient:
      "radial-gradient(ellipse at 30% 50%, rgb(var(--brand-primary-rgb) / 0.12), transparent 70%)",
    bullets: [
      "Start Session launcher",
      "Google Meet or existing meeting path",
      "Tag and Notion destination selection",
    ],
    preview: {
      title: "Session preflight",
      rows: [
        { label: "Type", value: "Instant Google Meet" },
        { label: "Tag", value: "Engineering" },
        { label: "Destination", value: "Notion — Launch Hub" },
        { label: "Auto-sync", value: "Enabled" },
      ],
    },
  },
  {
    title: "During the session",
    phase: "02",
    description:
      "Capture stays local while the desktop HUD keeps the meeting controllable. Participant identity, highlights, notes, and actions stay attached to the active session.",
    icon: <Mic className="h-8 w-8" style={{ color: "var(--brand-support)" }} />,
    accent: "var(--brand-support)",
    gradient:
      "radial-gradient(ellipse at 70% 50%, rgb(var(--brand-support-rgb) / 0.12), transparent 70%)",
    bullets: [
      "Local recording and transcript history",
      "Dynamic island controls and quick notes",
      "Stable participant identity in review",
    ],
    preview: {
      title: "Live capture",
      rows: [
        { label: "Recording", value: "00:24:18" },
        { label: "Speakers", value: "3 resolved" },
        { label: "Highlights", value: "2 marked" },
        { label: "Actions", value: "1 tagged" },
      ],
    },
  },
  {
    title: "After the meeting",
    phase: "03",
    description:
      "The finalized meeting package flows into review, post-meeting AI, memory, and export surfaces so users can finish the follow-up without rebuilding the meeting context.",
    icon: <FileText className="h-8 w-8" style={{ color: "var(--brand-trust)" }} />,
    accent: "var(--brand-trust)",
    gradient:
      "radial-gradient(ellipse at 30% 50%, rgb(var(--brand-trust-rgb) / 0.12), transparent 70%)",
    bullets: [
      "AI status rail and summary artifacts",
      "Targeted regeneration and memory reuse",
      "Markdown, Notion, and export-ready outputs",
    ],
    preview: {
      title: "Post-meeting outputs",
      rows: [
        { label: "Summary", value: "Ready" },
        { label: "Tasks", value: "4 extracted" },
        { label: "Decisions", value: "3 captured" },
        { label: "Memory", value: "2 related meetings" },
      ],
    },
  },
];

const connectorDirections: Array<"left-to-right" | "right-to-left"> = [
  "left-to-right",
  "right-to-left",
];

export function MeetingLifecycle() {
  return (
    <section className="relative overflow-hidden border-t border-white/5 bg-transparent py-24">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        {/* Section header */}
        <div className="mx-auto mb-20 max-w-3xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading mb-4 text-3xl font-bold text-white md:text-5xl"
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

        {/* Zigzag snake-flow layout */}
        <div className="mx-auto flex max-w-6xl flex-col">
          {stages.map((stage, index) => {
            const isEven = index % 2 === 0;

            return (
              <React.Fragment key={stage.title}>
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
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900 shadow-lg"
                        style={{ boxShadow: `0 0 32px -20px ${stage.accent}` }}
                      >
                        {stage.icon}
                      </div>
                      <span
                        className="font-heading text-5xl font-bold"
                        style={{ color: `color-mix(in srgb, ${stage.accent} 30%, transparent)` }}
                      >
                        {stage.phase}
                      </span>
                    </div>
                    <h3 className="font-heading text-3xl font-bold tracking-tight text-white">
                      {stage.title}
                    </h3>
                    <p className="max-w-md text-lg leading-relaxed text-zinc-400">
                      {stage.description}
                    </p>
                    <div className="space-y-2 pt-2">
                      {stage.bullets.map((bullet) => (
                        <div key={bullet} className="flex items-center gap-2.5">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: stage.accent, opacity: 0.5 }}
                          />
                          <p className="text-sm text-zinc-300">{bullet}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preview panel (terminal-style) */}
                  <div className="relative z-10 w-full max-w-[420px] flex-1">
                    <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-950/80 transition-all duration-300 group-hover:border-white/12 group-hover:shadow-[0_0_40px_-20px_rgba(232,169,88,0.15)]">
                      {/* Terminal header */}
                      <div className="flex h-10 items-center gap-2 border-b border-white/5 bg-zinc-900/60 px-4">
                        <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                        <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                        <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                        <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                          {stage.preview.title}
                        </span>
                      </div>
                      {/* Preview rows */}
                      <div className="p-5">
                        <div className="space-y-3">
                          {stage.preview.rows.map((row) => (
                            <div
                              key={row.label}
                              className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5"
                            >
                              <span className="text-xs text-zinc-500">{row.label}</span>
                              <span className="text-xs font-medium text-zinc-200">{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Curved connector arrow */}
                {index < stages.length - 1 && (
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

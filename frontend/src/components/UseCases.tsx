"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarRange, FileText, RefreshCcw } from "lucide-react";
import React, { useState } from "react";

const useCases = [
  {
    id: "session-launch",
    title: "Structured session launch",
    icon: <CalendarRange className="h-5 w-5" />,
    description:
      "Choose Instant Google Meet, Record Existing Meeting, or Quick Local Notes before capture begins.",
    mockup: {
      interviewer:
        "Session type: Instant Google Meet | Title: Release Readiness | Tag: Engineering | Notion: Launch Hub",
      ai: "NextStop will create the Meet link, store the meeting metadata locally, and open the review flow when the session ends.",
      badge: "Start Session",
    },
  },
  {
    id: "review-regenerate",
    title: "Review, regenerate, and verify",
    icon: <RefreshCcw className="h-5 w-5" />,
    description:
      "Inspect the AI status rail, preserve partial output, and rerun only the summary, tasks, or draft that needs attention.",
    mockup: {
      interviewer:
        "Overall: Partial success | Summary ready | Tasks failed | Memory ready",
      ai: "Regenerate Tasks queued. Existing summary, decisions, and follow-ups stay visible while the task extractor reruns.",
      badge: "AI Review",
    },
  },
  {
    id: "workspace-sync",
    title: "Google + Notion workspace sync",
    icon: <FileText className="h-5 w-5" />,
    description:
      "Route meetings into Google Calendar, page-first Notion exports, and canonical markdown artifacts without rebuilding the follow-up by hand.",
    mockup: {
      interviewer:
        "Sync mode: Page + tasks database | Destination: Product Knowledge Hub",
      ai: "Preview confirmed. Creating the meeting page, syncing action items, and saving the canonical markdown artifact locally.",
      badge: "Workspace Sync",
    },
  },
];

export function UseCases() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="relative overflow-hidden border-t border-white/5 bg-transparent py-24">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 md:flex-row">
          <div className="relative w-full flex-1">
            <h2 className="mb-6 text-3xl font-bold text-white md:text-5xl">
              Built for the full <br /> meeting{" "}
              <span className="brand-gradient-text">lifecycle</span>.
            </h2>
            <p className="mb-8 text-lg text-zinc-400">
              NextStop now covers the moments before, during, and after the
              meeting so nothing gets lost between launch, review, and export.
            </p>

            <div className="flex flex-col gap-3">
              {useCases.map((useCase, idx) => {
                const isActive = activeTab === idx;

                return (
                  <button
                    key={useCase.id}
                    onClick={() => setActiveTab(idx)}
                    className="brand-card-hover flex items-start gap-4 rounded-xl border p-4 text-left transition-all"
                    style={{
                      borderColor: isActive
                        ? "rgb(var(--brand-primary-rgb) / 0.3)"
                        : "transparent",
                      background: isActive
                        ? "linear-gradient(135deg, rgb(var(--brand-primary-rgb) / 0.14), rgb(var(--brand-trust-rgb) / 0.08))"
                        : "transparent",
                      boxShadow: isActive
                        ? "0 0 34px -24px rgb(var(--brand-primary-rgb) / 0.75)"
                        : "none",
                    }}
                  >
                    <div
                      className="mt-1 rounded-lg p-2 transition-colors"
                      style={{
                        background: isActive
                          ? "rgb(var(--brand-primary-rgb) / 0.18)"
                          : "rgb(39 39 42 / 1)",
                        color: isActive
                          ? "var(--brand-highlight)"
                          : "rgb(161 161 170)",
                      }}
                    >
                      {useCase.icon}
                    </div>
                    <div>
                      <h3
                        className="mb-1 font-bold transition-colors"
                        style={{ color: isActive ? "#ffffff" : "#a1a1aa" }}
                      >
                        {useCase.title}
                      </h3>
                      <p className="text-sm text-zinc-500">{useCase.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-[400px] w-full flex-1">
            <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 p-2 shadow-2xl before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/8 before:to-transparent md:p-4">
              <div className="relative flex min-h-[400px] w-full flex-col overflow-hidden rounded-xl border border-white/5 bg-[#0a0a0a]">
                <div className="flex h-12 items-center justify-between gap-2 border-b border-white/5 bg-[#1a1a1a] px-4">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-500/80"></div>
                    <div className="h-3 w-3 rounded-full bg-green-500/80"></div>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="brand-chip-trust rounded-full px-3 py-1 font-mono text-xs"
                    >
                      {useCases[activeTab].mockup.badge}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="relative flex flex-1 flex-col justify-center gap-6 p-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`int-${activeTab}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="w-[85%] self-start rounded-xl border border-white/5 bg-zinc-900 p-4"
                    >
                      <p className="mb-2 font-mono text-xs text-zinc-500">
                        Workflow State
                      </p>
                      <p className="text-sm text-zinc-300">
                        &quot;{useCases[activeTab].mockup.interviewer}&quot;
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`ai-${activeTab}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="w-[85%] self-end rounded-xl border p-4"
                      style={{
                        borderColor: "rgb(var(--brand-primary-rgb) / 0.3)",
                        background:
                          "linear-gradient(135deg, rgb(var(--brand-primary-rgb) / 0.14), rgb(var(--brand-trust-rgb) / 0.16))",
                        boxShadow:
                          "0 0 20px -10px rgb(var(--brand-primary-rgb) / 0.45)",
                      }}
                    >
                      <p
                        className="mb-2 flex items-center gap-2 font-mono text-xs"
                        style={{ color: "var(--brand-highlight)" }}
                      >
                        <span
                          className="h-2 w-2 animate-pulse rounded-full"
                        style={{ backgroundColor: "var(--brand-primary)" }}
                        ></span>
                        NextStop Action
                      </p>
                      <p className="text-sm text-zinc-100">
                        {useCases[activeTab].mockup.ai}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import { FileText, RefreshCcw, Sparkles, Workflow } from "lucide-react";
import React, { useState } from "react";

type SurfaceTone = "warm" | "support" | "trust";

const surfaces: Array<{
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: SurfaceTone;
  chips: string[];
  previewTitle: string;
  previewRows: string[];
}> = [
  {
    title: "AI status rail",
    description:
      "Users can see what completed, what was cached, what failed, and what can be retried without throwing away the good output.",
    icon: <Sparkles className="h-5 w-5" />,
    tone: "warm",
    chips: ["model used", "cache state", "cost visibility"],
    previewTitle: "Status snapshot",
    previewRows: [
      "Overall: Partial success",
      "Summary ready  |  Tasks failed",
      "Retry only the failed target",
    ],
  },
  {
    title: "Final meeting artifacts",
    description:
      "Completed sessions can produce summaries, executive bullets, decisions, action items, risks, and follow-ups that are ready for review.",
    icon: <FileText className="h-5 w-5" />,
    tone: "support",
    chips: ["summary", "tasks", "draft-ready"],
    previewTitle: "Artifact bundle",
    previewRows: [
      "Summary full + executive bullets",
      "Decisions 3  |  Action items 4",
      "Risks and follow-ups attached",
    ],
  },
  {
    title: "Targeted regeneration",
    description:
      "Instead of rerunning the whole meeting, the user can regenerate only the summary, tasks, or draft that needs help.",
    icon: <RefreshCcw className="h-5 w-5" />,
    tone: "trust",
    chips: ["partial success", "retry only what changed", "faster recovery"],
    previewTitle: "Recovery controls",
    previewRows: [
      "Regenerate Summary",
      "Regenerate Tasks",
      "Generate or rerun Draft",
    ],
  },
  {
    title: "Simple and advanced modes",
    description:
      "The product can stay guided for daily use or open a deeper operator surface when the team needs richer meeting controls.",
    icon: <Workflow className="h-5 w-5" />,
    tone: "warm",
    chips: ["guided mode", "advanced toggle", "power-user review"],
    previewTitle: "Mode switch",
    previewRows: [
      "Simple: guided review",
      "Advanced: AI rail + memory",
      "Pro unlocks the deeper toggle",
    ],
  },
];

const toneColors: Record<SurfaceTone, { bg: string; color: string; accent: string }> = {
  warm: {
    bg: "rgb(var(--brand-primary-rgb) / 0.12)",
    color: "var(--brand-primary)",
    accent: "rgb(var(--brand-primary-rgb) / 0.25)",
  },
  support: {
    bg: "rgb(var(--brand-support-rgb) / 0.12)",
    color: "var(--brand-highlight)",
    accent: "rgb(var(--brand-support-rgb) / 0.25)",
  },
  trust: {
    bg: "rgb(var(--brand-trust-rgb) / 0.12)",
    color: "var(--brand-trust)",
    accent: "rgb(var(--brand-trust-rgb) / 0.25)",
  },
};

export function MeetingOutputs() {
  const [activeTab, setActiveTab] = useState(0);
  const active = surfaces[activeTab];

  return (
    <section className="relative overflow-hidden border-t border-white/5 bg-transparent py-24">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="font-heading mb-4 text-3xl font-bold text-white md:text-5xl">
            What users actually get after a meeting
          </h2>
          <p className="text-lg text-zinc-400">
            Capture is only the beginning. The product also gives users a clear
            review surface, controllable AI outputs, reusable artifacts, and a
            choice between simple and advanced operation.
          </p>
        </div>

        <div className="mx-auto max-w-5xl">
          {/* Tab bar */}
          <div className="mb-8 flex flex-wrap gap-2 justify-center">
            {surfaces.map((surface, index) => {
              const isActive = activeTab === index;
              return (
                <button
                  key={surface.title}
                  onClick={() => setActiveTab(index)}
                  className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300"
                  style={{
                    borderColor: isActive
                      ? toneColors[surface.tone].accent
                      : "rgb(255 255 255 / 0.08)",
                    background: isActive
                      ? toneColors[surface.tone].bg
                      : "transparent",
                    color: isActive ? "#fff" : "#a1a1aa",
                    boxShadow: isActive
                      ? `0 0 24px -12px ${toneColors[surface.tone].color}`
                      : "none",
                  }}
                >
                  <span style={{ color: isActive ? toneColors[surface.tone].color : undefined }}>
                    {surface.icon}
                  </span>
                  {surface.title}
                </button>
              );
            })}
          </div>

          {/* Active tab content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-white/8 bg-zinc-950/80 p-8 hover-border-gradient"
          >
            <div className="flex flex-col gap-8 md:flex-row">
              {/* Left: description */}
              <div className="flex-1">
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{
                    background: toneColors[active.tone].bg,
                    color: toneColors[active.tone].color,
                  }}
                >
                  {active.icon}
                </div>
                <h3 className="font-heading mb-3 text-2xl font-bold text-white">
                  {active.title}
                </h3>
                <p className="mb-5 leading-relaxed text-zinc-400">
                  {active.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {active.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border px-3 py-1 text-xs font-medium text-zinc-300"
                      style={{
                        borderColor: toneColors[active.tone].accent,
                        background: toneColors[active.tone].bg,
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: preview */}
              <div className="flex-1">
                <div className="rounded-xl border border-white/6 bg-black/40 p-5">
                  <p className="mb-4 text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                    {active.previewTitle}
                  </p>
                  <div className="space-y-3">
                    {active.previewRows.map((row) => (
                      <div
                        key={row}
                        className="rounded-lg border border-white/6 bg-white/[0.02] px-4 py-3 text-sm text-zinc-300"
                      >
                        {row}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

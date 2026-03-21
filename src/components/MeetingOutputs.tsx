"use client";

import { motion } from "framer-motion";
import { FileText, RefreshCcw, Sparkles, Workflow } from "lucide-react";
import React from "react";

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

const surfaceRgb: Record<SurfaceTone, string> = {
  warm: "242 129 69",
  support: "232 169 88",
  trust: "80 103 184",
};

const iconStyles: Record<SurfaceTone, { bg: string; color: string }> = {
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

export function MeetingOutputs() {
  return (
    <section className="relative overflow-hidden border-t border-white/5 bg-transparent py-24">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl">
            What users actually get after a meeting
          </h2>
          <p className="text-lg text-zinc-400">
            Capture is only the beginning. The product also gives users a clear
            review surface, controllable AI outputs, reusable artifacts, and a
            choice between simple and advanced operation.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
          {surfaces.map((surface, index) => (
            <motion.div
              key={surface.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              className="brand-surface-card rounded-[1.75rem]"
              style={{ "--surface-rgb": surfaceRgb[surface.tone] } as React.CSSProperties}
            >
              <div className="brand-surface-frame rounded-[1.75rem] p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{
                      background: iconStyles[surface.tone].bg,
                      color: iconStyles[surface.tone].color,
                    }}
                  >
                    {surface.icon}
                  </div>
                  <div
                    className="h-px w-24"
                    style={{
                      background:
                        "linear-gradient(to right, transparent, rgb(var(--brand-highlight-rgb) / 0.85), transparent)",
                    }}
                  />
                </div>

                <h3 className="mb-3 text-2xl font-bold text-white">{surface.title}</h3>
                <p className="mb-6 text-zinc-400">{surface.description}</p>

                <div className="mb-5 flex flex-wrap gap-2">
                  {surface.chips.map((chip) => (
                    <span
                      key={chip}
                      className="brand-surface-chip rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs font-medium text-zinc-300"
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                <div className="brand-surface-grid rounded-2xl border border-white/8 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                      {surface.previewTitle}
                    </p>
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          surface.tone === "trust"
                            ? "var(--brand-trust)"
                            : surface.tone === "support"
                              ? "var(--brand-highlight)"
                              : "var(--brand-primary)",
                        boxShadow:
                          surface.tone === "trust"
                            ? "0 0 14px rgb(var(--brand-trust-rgb) / 0.7)"
                            : surface.tone === "support"
                              ? "0 0 14px rgb(var(--brand-highlight-rgb) / 0.7)"
                              : "0 0 14px rgb(var(--brand-primary-rgb) / 0.7)",
                      }}
                    />
                  </div>

                  <div className="space-y-3">
                    {surface.previewRows.map((row) => (
                      <div
                        key={row}
                        className="brand-surface-chip rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-300"
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
    </section>
  );
}

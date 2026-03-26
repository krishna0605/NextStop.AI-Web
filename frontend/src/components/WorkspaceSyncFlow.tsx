"use client";

import { motion } from "framer-motion";
import { ArrowRight, CalendarRange, FileText, LayoutTemplate } from "lucide-react";
import React from "react";

const syncSteps = [
  {
    title: "Google scheduling and launch",
    description:
      "Create or connect the meeting from the desktop flow, keep the metadata attached, and bring the session into the app with less friction.",
    icon: <CalendarRange className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />,
    details: ["Instant Google Meet", "calendar metadata", "launch-ready session"],
    previewTitle: "Meeting linked",
    previewRows: ["Primary calendar", "Meet link created", "Ready to start local session"],
  },
  {
    title: "Canonical markdown artifact",
    description:
      "A durable markdown artifact becomes the reusable source for preview, retry, audit history, and sync behavior instead of rebuilding output every time.",
    icon: <FileText className="h-5 w-5" style={{ color: "var(--brand-trust)" }} />,
    details: ["preview first", "retryable", "stored locally"],
    previewTitle: "Artifact ready",
    previewRows: ["# Release Sync", "Decisions + tasks included", "Preview before sync"],
  },
  {
    title: "Notion and workspace routes",
    description:
      "Users can route the meeting into page-first or task-aware destinations while keeping the export path observable and reversible.",
    icon: <LayoutTemplate className="h-5 w-5" style={{ color: "var(--brand-highlight)" }} />,
    details: ["page only", "page + tasks", "auto-sync or review first"],
    previewTitle: "Destination route",
    previewRows: ["Mode: Page + tasks", "Parent: Product Hub", "Retry if sync fails"],
  },
];

export function WorkspaceSyncFlow() {
  return (
    <section className="relative overflow-hidden border-t border-white/5 bg-transparent py-24">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading mb-4 text-3xl font-bold text-white md:text-5xl"
          >
            How workspace sync actually flows
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg text-zinc-400"
          >
            Google, local markdown, and Notion are not separate ideas. They are
            one continuous route from meeting setup to reusable workspace output.
          </motion.p>
        </div>

        {/* Horizontal flow panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-6xl rounded-2xl border border-white/8 bg-zinc-950/60 hover-border-gradient"
        >
          <div className="flex flex-col md:flex-row">
            {syncSteps.map((step, index) => (
              <React.Fragment key={step.title}>
                <div className="relative flex-1 p-6 md:p-8">
                  {/* Icon + title */}
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{
                        background:
                          index === 0
                            ? "rgb(var(--brand-primary-rgb) / 0.14)"
                            : index === 1
                              ? "rgb(var(--brand-trust-rgb) / 0.14)"
                              : "rgb(var(--brand-support-rgb) / 0.14)",
                      }}
                    >
                      {step.icon}
                    </div>
                    <h3 className="font-heading text-lg font-bold text-white">{step.title}</h3>
                  </div>

                  <p className="mb-4 text-sm leading-relaxed text-zinc-400">
                    {step.description}
                  </p>

                  {/* Detail chips */}
                  <div className="mb-5 flex flex-wrap gap-2">
                    {step.details.map((detail) => (
                      <span
                        key={detail}
                        className="rounded-full border border-white/6 bg-white/[0.03] px-2.5 py-0.5 text-xs text-zinc-400"
                      >
                        {detail}
                      </span>
                    ))}
                  </div>

                  {/* Preview rows */}
                  <div className="rounded-xl border border-white/5 bg-black/30 p-4">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                      {step.previewTitle}
                    </p>
                    <div className="space-y-1.5">
                      {step.previewRows.map((row) => (
                        <p key={row} className="text-xs text-zinc-400">
                          {row}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Arrow divider between steps */}
                {index < syncSteps.length - 1 && (
                  <div className="hidden items-center px-0 md:flex">
                    <div className="flex h-full flex-col items-center justify-center">
                      <div className="h-full w-px bg-white/6" />
                      <ArrowRight className="my-2 h-4 w-4 shrink-0 text-zinc-600" />
                      <div className="h-full w-px bg-white/6" />
                    </div>
                  </div>
                )}
                {index < syncSteps.length - 1 && (
                  <div className="border-b border-white/6 md:hidden" />
                )}
              </React.Fragment>
            ))}
          </div>
        </motion.div>

        {/* Route options */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {[
            "Review first",
            "Page only",
            "Page + tasks",
            "Auto-sync",
            "Retry from artifact",
          ].map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/8 bg-zinc-950/70 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-white/16 hover:text-white"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

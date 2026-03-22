"use client";

import { motion } from "framer-motion";
import { ArrowRight, CalendarRange, FileText, LayoutTemplate, RefreshCcw } from "lucide-react";
import React from "react";

type SyncTone = "warm" | "support" | "trust";

const syncCards: Array<{
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: SyncTone;
  details: string[];
}> = [
  {
    title: "Google scheduling and launch",
    description:
      "Create or connect the meeting from the desktop flow, keep the metadata attached, and bring the session into the app with less friction.",
    icon: <CalendarRange className="h-5 w-5" />,
    tone: "warm",
    details: ["Instant Google Meet", "calendar metadata", "launch-ready session"],
  },
  {
    title: "Canonical markdown artifact",
    description:
      "A durable markdown artifact becomes the reusable source for preview, retry, audit history, and sync behavior instead of rebuilding output every time.",
    icon: <FileText className="h-5 w-5" />,
    tone: "trust",
    details: ["preview first", "retryable", "stored locally"],
  },
  {
    title: "Notion and workspace routes",
    description:
      "Users can route the meeting into page-first or task-aware destinations while keeping the export path observable and reversible.",
    icon: <LayoutTemplate className="h-5 w-5" />,
    tone: "support",
    details: ["page only", "page + tasks", "auto-sync or review first"],
  },
];

const surfaceRgb: Record<SyncTone, string> = {
  warm: "242 129 69",
  support: "232 169 88",
  trust: "80 103 184",
};

const iconTone: Record<SyncTone, { bg: string; color: string }> = {
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

export function WorkspaceSyncFlow() {
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

        <div className="relative mx-auto max-w-6xl">
          <div className="pointer-events-none absolute left-[17%] right-[17%] top-24 hidden items-center justify-between md:flex">
            <div className="brand-surface-line flex-1" />
            <ArrowRight className="mx-3 h-4 w-4 text-[var(--brand-highlight)]" />
            <div className="brand-surface-line flex-1" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {syncCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-90px" }}
                transition={{ duration: 0.45, delay: index * 0.07 }}
                className="brand-surface-card rounded-[1.75rem]"
                style={{ "--surface-rgb": surfaceRgb[card.tone] } as React.CSSProperties}
              >
                <div className="brand-surface-frame rounded-[1.75rem] p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{
                        background: iconTone[card.tone].bg,
                        color: iconTone[card.tone].color,
                      }}
                    >
                      {card.icon}
                    </div>
                    <RefreshCcw className="h-4 w-4 text-zinc-600" />
                  </div>

                  <h3 className="mb-3 text-2xl font-bold text-white">{card.title}</h3>
                  <p className="mb-6 text-sm leading-relaxed text-zinc-400">
                    {card.description}
                  </p>

                  <div className="mb-6 flex flex-wrap gap-2">
                    {card.details.map((detail) => (
                      <span
                        key={detail}
                        className="brand-surface-chip rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs font-medium text-zinc-300"
                      >
                        {detail}
                      </span>
                    ))}
                  </div>

                  <div className="brand-surface-grid rounded-2xl border border-white/8 p-4">
                    {card.tone === "warm" ? (
                      <SyncPreview
                        title="Meeting linked"
                        rows={[
                          "Primary calendar",
                          "Meet link created",
                          "Ready to start local session",
                        ]}
                      />
                    ) : null}
                    {card.tone === "trust" ? (
                      <SyncPreview
                        title="Artifact ready"
                        rows={[
                          "# Release Sync",
                          "Decisions + tasks included",
                          "Preview before sync",
                        ]}
                      />
                    ) : null}
                    {card.tone === "support" ? (
                      <SyncPreview
                        title="Destination route"
                        rows={[
                          "Mode: Page + tasks",
                          "Parent: Product Hub",
                          "Retry if sync fails",
                        ]}
                      />
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

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
                className="brand-card-hover rounded-full border border-white/8 bg-zinc-950/70 px-4 py-2 text-sm text-zinc-300"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SyncPreview({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div>
      <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-zinc-500">
        {title}
      </p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row}
            className="brand-surface-chip rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-300"
          >
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}

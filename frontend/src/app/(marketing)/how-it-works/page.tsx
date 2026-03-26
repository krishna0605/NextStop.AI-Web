"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import {
  Workflow,
  Cog,
  Code2,
  CalendarRange,
  FileText,
  RefreshCcw,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import React from "react";

import { Footer } from "@/components/Footer";

const steps = [
  {
    number: "01",
    icon: <Workflow className="h-7 w-7" />,
    iconColor: "var(--brand-trust)",
    title: "Launch a structured session",
    description:
      "Choose Instant Google Meet, Record Existing Meeting, or Quick Local Notes, then set the title, tag, destination, and sync defaults before capture begins.",
    details: [
      "Three session types to match your context",
      "Pre-set Notion destination and tags",
      "Auto-sync toggle for post-meeting export",
      "Google Calendar integration for scheduled meetings",
    ],
    code: `const session = await nextstop.startSession({
  type: "instant_google_meet",
  title: "Release Readiness",
  tag: "Engineering",
  notionDestination: "Launch Hub",
  autoSyncOnFinish: true
});`,
  },
  {
    number: "02",
    icon: <Cog className="h-7 w-7" />,
    iconColor: "var(--brand-primary)",
    title: "Capture locally with speaker context",
    description:
      "Record on desktop, keep participant identity stable, and use the live HUD for notes, highlights, action items, and session control while the transcript stays organized.",
    details: [
      "Local Rust engine for low-latency recording",
      "Speaker diarization without cloud dependency",
      "Live HUD: highlight, note, action item, end",
      "Transcript history stored on your machine",
    ],
    code: `session.on("speaker_update", ({ speaker, text }) => {
  reviewBuffer.append({ speaker, text });
});

await session.showHud([
  "highlight", "note", "action", "end"
]);`,
  },
  {
    number: "03",
    icon: <Code2 className="h-7 w-7" />,
    iconColor: "var(--brand-support)",
    title: "Run post-meeting AI and sync",
    description:
      "When the meeting ends, NextStop sends a finalized meeting package to the secure gateway for extraction, final synthesis, memory lookup, drafting, and export alignment.",
    details: [
      "Structured extraction: summary, decisions, tasks",
      "Related-meeting memory for context enrichment",
      "Targeted regeneration for failed outputs",
      "Workspace sync: Notion pages + task databases",
    ],
    code: `const job = await ai.queuePostMeetingAnalysis(meetingId);
await ai.waitForCompletion(job.id);

await sync.export({
  notion: "page_plus_tasks",
  includeDraft: true,
  includeRelatedMeetings: true
});`,
  },
];

const lifecycle = [
  {
    icon: <CalendarRange className="h-6 w-6" />,
    iconColor: "var(--brand-primary)",
    phase: "Before",
    title: "Set up with intention",
    description:
      "Start with a structured session launcher — pick the meeting type, set the title, choose tags and Notion destination, and enable auto-sync. No accidental recordings.",
  },
  {
    icon: <RefreshCcw className="h-6 w-6" />,
    iconColor: "var(--brand-highlight)",
    phase: "During",
    title: "Capture with context",
    description:
      "The Rust engine records locally while the HUD lets you add highlights, notes, and action items. Speaker identity stays stable throughout. Audio never leaves your machine.",
  },
  {
    icon: <FileText className="h-6 w-6" />,
    iconColor: "var(--brand-support)",
    phase: "After",
    title: "Review and export",
    description:
      "Post-meeting AI generates summaries, tasks, decisions, and drafts. You review everything, regenerate what needs fixing, and sync the canonical artifact to Notion and Calendar.",
  },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function HowItWorksPage() {
  return (
    <>
      <main className="min-h-screen w-full overflow-x-hidden pt-28">
        {/* Hero */}
        <section className="relative py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="brand-chip mb-8 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium"
              >
                <Workflow className="mr-2 h-4 w-4" style={{ color: "var(--brand-trust)" }} />
                Three-Step Workflow
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="font-heading mb-6 text-4xl font-bold tracking-tight text-white md:text-6xl"
              >
                From session launch to{" "}
                <span className="brand-gradient-text text-shimmer">
                  synced follow-up
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="text-xl leading-relaxed text-zinc-400"
              >
                Every NextStop session follows the same three clean steps.
                No background bots, no cloud streaming — just a structured desktop
                workflow that finishes the meeting follow-up.
              </motion.p>
            </div>
          </div>
        </section>

        {/* 3-Step Walkthrough */}
        <section className="border-t border-white/5 py-24">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="mx-auto flex max-w-6xl flex-col gap-28"
            >
              {steps.map((step, index) => {
                const isEven = index % 2 === 0;

                return (
                  <motion.div
                    key={step.title}
                    variants={fadeUp}
                    className={`flex flex-col items-start gap-12 md:flex-row ${
                      !isEven ? "md:flex-row-reverse" : ""
                    }`}
                  >
                    {/* Text */}
                    <div className="flex-1 space-y-5">
                      <div className="flex items-center gap-4">
                        <div
                          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10"
                          style={{
                            background: `color-mix(in srgb, ${step.iconColor} 16%, transparent)`,
                            color: step.iconColor,
                          }}
                        >
                          {step.icon}
                        </div>
                        <span className="font-heading text-5xl font-bold text-zinc-800">
                          {step.number}
                        </span>
                      </div>
                      <h2 className="font-heading text-3xl font-bold text-white text-hover-brand cursor-default">
                        {step.title}
                      </h2>
                      <p className="max-w-lg text-lg leading-relaxed text-zinc-400">
                        {step.description}
                      </p>
                      <ul className="space-y-3 pt-2">
                        {step.details.map((detail) => (
                          <li key={detail} className="flex items-center gap-3">
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: step.iconColor }}
                            />
                            <span className="text-sm text-zinc-300">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Code block */}
                    <div className="w-full max-w-[480px] flex-1">
                      <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
                        <div
                          className="pointer-events-none absolute inset-0 opacity-60"
                          style={{
                            background: `linear-gradient(135deg, color-mix(in srgb, ${step.iconColor} 20%, transparent), transparent 70%)`,
                          }}
                        />
                        <div className="relative z-10 flex h-10 items-center border-b border-white/5 bg-zinc-900/60 px-4">
                          <div className="flex gap-2">
                            <div className="h-3 w-3 rounded-full bg-zinc-700" />
                            <div className="h-3 w-3 rounded-full bg-zinc-700" />
                            <div className="h-3 w-3 rounded-full bg-zinc-700" />
                          </div>
                        </div>
                        <div className="relative z-10 p-6 font-mono text-sm">
                          <pre className="overflow-x-auto text-zinc-300">
                            <code>{step.code}</code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* Meeting Lifecycle */}
        <section className="border-t border-white/5 py-24">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="font-heading mb-4 text-center text-3xl font-bold text-white md:text-4xl">
              Before, during, and after
            </h2>
            <p className="mx-auto mb-16 max-w-2xl text-center text-lg text-zinc-400">
              The full product loop — from guided setup to local capture to reviewable,
              exportable follow-up.
            </p>

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3"
            >
              {lifecycle.map((item) => (
                <motion.div
                  key={item.phase}
                  variants={fadeUp}
                  className="hover-border-gradient rounded-2xl border border-white/8 bg-zinc-950/60 p-8"
                >
                  <div className="mb-5 flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{
                        background: `color-mix(in srgb, ${item.iconColor} 16%, transparent)`,
                        color: item.iconColor,
                      }}
                    >
                      {item.icon}
                    </div>
                    <span
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: item.iconColor }}
                    >
                      {item.phase}
                    </span>
                  </div>
                  <h3 className="font-heading mb-3 text-xl font-bold text-white text-hover-brand cursor-default">
                    {item.title}
                  </h3>
                  <p className="leading-relaxed text-zinc-400">{item.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-white/5 py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading mb-6 text-3xl font-bold text-white md:text-4xl">
                Try the workflow yourself
              </h2>
              <p className="mb-8 text-lg text-zinc-400">
                Download the desktop app, run your first session, and see
                structured follow-up in action.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  radius="full"
                  className="brand-button-primary button-shine h-12 px-8 font-semibold"
                >
                  Download Desktop App
                </Button>
                <Link href="/pricing">
                  <Button
                    size="lg"
                    variant="bordered"
                    radius="full"
                    className="brand-button-secondary button-shine h-12 px-8 font-semibold"
                    endContent={<ArrowRight className="h-4 w-4" />}
                  >
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}

"use client";

import { motion } from "framer-motion";
import { Code2, Cog, Workflow } from "lucide-react";
import React, { useRef } from "react";

const steps = [
  {
    title: "Launch a structured session",
    description:
      "Choose Instant Google Meet, Record Existing Meeting, or Quick Local Notes, then set the title, tag, destination, and sync defaults before capture begins.",
    icon: <Workflow className="h-8 w-8" style={{ color: "var(--brand-trust)" }} />,
    gradient:
      "linear-gradient(135deg, rgb(var(--brand-trust-rgb) / 0.24), transparent 75%)",
    accent: "var(--brand-trust)",
    code: `const session = await nextstop.startSession({
  type: "instant_google_meet",
  title: "Release Readiness",
  tag: "Engineering",
  notionDestination: "Launch Hub",
  autoSyncOnFinish: true
});

console.log("Session preflight complete.");`,
  },
  {
    title: "Capture locally with speaker context",
    description:
      "Record on desktop, keep participant identity stable, and use the live HUD for notes, highlights, action items, and session control while the transcript stays organized.",
    icon: <Cog className="h-8 w-8" style={{ color: "var(--brand-primary)" }} />,
    gradient:
      "linear-gradient(135deg, rgb(var(--brand-primary-rgb) / 0.22), transparent 72%)",
    accent: "var(--brand-primary)",
    code: `session.on("speaker_update", ({ speaker, text }) => {
  reviewBuffer.append({ speaker, text });
});

await session.showHud([
  "highlight",
  "note",
  "action",
  "end"
]);

console.log("Local capture is running.");`,
  },
  {
    title: "Run post-meeting AI and sync",
    description:
      "When the meeting ends, NextStop sends a finalized meeting package to the secure gateway for extraction, final synthesis, memory lookup, drafting, and export alignment.",
    icon: <Code2 className="h-8 w-8" style={{ color: "var(--brand-support)" }} />,
    gradient:
      "linear-gradient(135deg, rgb(var(--brand-highlight-rgb) / 0.14), rgb(var(--brand-primary-rgb) / 0.12) 45%, transparent 80%)",
    accent: "var(--brand-support)",
    code: `const job = await ai.queuePostMeetingAnalysis(meetingId);
await ai.waitForCompletion(job.id);

await sync.export({
  notion: "page_plus_tasks",
  includeDraft: true,
  includeRelatedMeetings: true
});

console.log("Artifacts saved and synced.");`,
  },
];

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <section
      id="how-it-works"
      ref={containerRef}
      className="relative w-full bg-transparent py-24"
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto mb-20 max-w-2xl text-center">
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            How it works
          </h2>
          <p className="text-lg text-zinc-400">
            From session launch to synced follow-up in three clean steps.
          </p>
        </div>

        <div className="mx-auto flex max-w-6xl flex-col gap-24 font-sans">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className={`flex flex-col items-center gap-12 md:flex-row ${
                index % 2 !== 0 ? "md:flex-row-reverse" : ""
              }`}
            >
              <div className="flex-1 space-y-6">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900 shadow-lg"
                  style={{
                    boxShadow: `0 0 28px -20px ${step.accent}`,
                  }}
                >
                  {step.icon}
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-white">
                  <span className="mr-2 text-zinc-600">0{index + 1}.</span>
                  {step.title}
                </h3>
                <p className="max-w-md text-lg leading-relaxed text-zinc-400">
                  {step.description}
                </p>
              </div>

              <div className="w-full max-w-[500px] flex-1">
                <motion.div
                  initial={{ opacity: 0, x: index % 2 === 0 ? 50 : -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, type: "spring" }}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-black"
                >
                  <div
                    className="absolute inset-0 transition-opacity group-hover:opacity-100"
                    style={{
                      background: step.gradient,
                      opacity: 0.7,
                    }}
                  />

                  <div className="relative z-10 flex h-10 items-center border-b border-white/5 bg-zinc-900/60 px-4">
                    <div className="flex gap-2">
                      <div className="h-3 w-3 rounded-full bg-zinc-700"></div>
                      <div className="h-3 w-3 rounded-full bg-zinc-700"></div>
                      <div className="h-3 w-3 rounded-full bg-zinc-700"></div>
                    </div>
                  </div>

                  <div className="relative z-10 p-6 font-mono text-sm">
                    <pre className="overflow-x-auto text-zinc-300">
                      <code>{step.code}</code>
                    </pre>
                  </div>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

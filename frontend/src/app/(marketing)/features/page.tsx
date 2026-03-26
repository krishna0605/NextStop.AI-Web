"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import {
  Cpu,
  Fingerprint,
  ShieldCheck,
  FileText,
  ArrowRight,
  CloudOff,
  Lock,
  Mic,
  RefreshCcw,
} from "lucide-react";
import Link from "next/link";
import React from "react";

import { Footer } from "@/components/Footer";

const features = [
  {
    number: "01",
    icon: <Cpu className="h-7 w-7" />,
    iconColor: "var(--brand-primary)",
    title: "Local Rust Session Engine",
    headline: "Capture stays on your machine.",
    description:
      "The desktop engine handles recording, buffering, and speaker-aware packaging locally. No audio leaves the laptop during the meeting. The Rust-based runtime keeps resource usage tight while managing session lifecycle, HUD overlays, and transcript storage.",
    details: [
      "Mic and system audio captured locally",
      "Speaker diarization runs on device",
      "Transcript history stored on desktop",
      "Session controls via live HUD overlay",
    ],
  },
  {
    number: "02",
    icon: <Fingerprint className="h-7 w-7" />,
    iconColor: "var(--brand-highlight)",
    title: "Participant Identity",
    headline: "Meeting-scoped speaker attribution.",
    description:
      "Every speaker gets a stable identity within the meeting scope. Rename flows, review history, and export consistency all depend on this grounding layer. When the transcript says 'Ravi agreed to update the checklist,' that attribution carries through to the summary, tasks, and Notion export.",
    details: [
      "Meeting-scoped speaker labels",
      "Rename and merge support",
      "Consistent attribution across outputs",
      "Review-safe identity binding",
    ],
  },
  {
    number: "03",
    icon: <ShieldCheck className="h-7 w-7" />,
    iconColor: "var(--brand-trust)",
    title: "Secure Gateway Boundary",
    headline: "Your production AI keys stay server-side.",
    description:
      "When the meeting ends, the desktop app sends a finalized meeting package to the gateway. The gateway holds the OpenAI key, applies extraction policy, and returns structured artifacts. The desktop never sees the production credential.",
    details: [
      "OpenAI keys held server-side only",
      "Post-meeting processing only",
      "Extraction policy enforcement",
      "Structured artifact return path",
    ],
  },
  {
    number: "04",
    icon: <FileText className="h-7 w-7" />,
    iconColor: "var(--brand-support)",
    title: "Canonical Artifact",
    headline: "One reusable markdown artifact per meeting.",
    description:
      "Every processed meeting produces a canonical markdown document that powers Notion sync, review history, and future exports. It's the single source of truth for that meeting's structured output — not a disposable summary that vanishes after the call.",
    details: [
      "Markdown-native structured output",
      "Powers Notion page + tasks sync",
      "Persistent review and export format",
      "Related-meeting memory source",
    ],
  },
];

const comparisons = [
  {
    aspect: "Audio during meeting",
    nextstop: "Stays on your laptop",
    others: "Streamed live to cloud",
    icon: <Mic className="h-4 w-4" />,
  },
  {
    aspect: "AI processing",
    nextstop: "Post-meeting only, through gateway",
    others: "Real-time cloud transcription",
    icon: <CloudOff className="h-4 w-4" />,
  },
  {
    aspect: "API key exposure",
    nextstop: "Server-held, never in desktop app",
    others: "Often embedded in client",
    icon: <Lock className="h-4 w-4" />,
  },
  {
    aspect: "Output review",
    nextstop: "Review, edit, regenerate selectively",
    others: "Take-it-or-leave-it summary",
    icon: <RefreshCcw className="h-4 w-4" />,
  },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function FeaturesPage() {
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
                <Cpu className="mr-2 h-4 w-4" style={{ color: "var(--brand-primary)" }} />
                Built for Meeting Operators
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="font-heading mb-6 text-4xl font-bold tracking-tight text-white md:text-6xl"
              >
                One desktop flow from{" "}
                <span className="brand-gradient-text text-shimmer">
                  launch to export
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="text-xl leading-relaxed text-zinc-400"
              >
                NextStop combines local session control, participant-aware capture,
                secure post-meeting AI, and workspace-ready exports in a single
                desktop workflow. Here&rsquo;s how each layer works.
              </motion.p>
            </div>
          </div>
        </section>

        {/* Feature Deep Dives */}
        <section className="border-t border-white/5 py-24">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="mx-auto flex max-w-6xl flex-col gap-32"
            >
              {features.map((feature, index) => {
                const isEven = index % 2 === 0;

                return (
                  <motion.div
                    key={feature.title}
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
                            background: `color-mix(in srgb, ${feature.iconColor} 16%, transparent)`,
                            color: feature.iconColor,
                          }}
                        >
                          {feature.icon}
                        </div>
                        <span className="font-heading text-5xl font-bold text-zinc-800">
                          {feature.number}
                        </span>
                      </div>
                      <h2 className="font-heading text-3xl font-bold text-white text-hover-brand cursor-default">
                        {feature.title}
                      </h2>
                      <p className="text-xl font-medium" style={{ color: feature.iconColor }}>
                        {feature.headline}
                      </p>
                      <p className="max-w-lg text-lg leading-relaxed text-zinc-400">
                        {feature.description}
                      </p>
                    </div>

                    {/* Detail card */}
                    <div className="w-full max-w-md flex-1">
                      <div className="hover-border-gradient rounded-2xl border border-white/8 bg-zinc-950/60 p-8">
                        <h3 className="font-heading mb-5 text-lg font-bold text-white">
                          Key capabilities
                        </h3>
                        <ul className="space-y-4">
                          {feature.details.map((detail) => (
                            <li key={detail} className="flex items-center gap-3">
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ background: feature.iconColor }}
                              />
                              <span className="text-zinc-300">{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="border-t border-white/5 py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-4xl">
              <h2 className="font-heading mb-4 text-center text-3xl font-bold text-white md:text-4xl">
                How NextStop compares
              </h2>
              <p className="mb-12 text-center text-lg text-zinc-400">
                A fundamentally different trust model from cloud-first meeting copilots.
              </p>

              <div className="overflow-hidden rounded-2xl border border-white/8">
                {/* Header */}
                <div className="grid grid-cols-3 border-b border-white/8 bg-zinc-900/60">
                  <div className="px-6 py-4 text-sm font-medium text-zinc-500" />
                  <div className="px-6 py-4 text-center">
                    <span
                      className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-black"
                      style={{
                        backgroundImage:
                          "linear-gradient(135deg, var(--brand-primary), var(--brand-highlight))",
                      }}
                    >
                      NextStop
                    </span>
                  </div>
                  <div className="px-6 py-4 text-center text-sm font-medium text-zinc-500">
                    Cloud copilots
                  </div>
                </div>

                {/* Rows */}
                {comparisons.map((row) => (
                  <div
                    key={row.aspect}
                    className="grid grid-cols-3 border-b border-white/5 transition-colors last:border-none hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3 px-6 py-5">
                      <span className="text-zinc-500">{row.icon}</span>
                      <span className="text-sm font-medium text-zinc-300">{row.aspect}</span>
                    </div>
                    <div className="flex items-center justify-center px-6 py-5 text-center text-sm text-zinc-200">
                      {row.nextstop}
                    </div>
                    <div className="flex items-center justify-center px-6 py-5 text-center text-sm text-zinc-500">
                      {row.others}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-white/5 py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading mb-6 text-3xl font-bold text-white md:text-4xl">
                Ready to try the local-first workflow?
              </h2>
              <p className="mb-8 text-lg text-zinc-400">
                Download the desktop app and run your first structured meeting session.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  radius="full"
                  className="brand-button-primary button-shine h-12 px-8 font-semibold"
                >
                  Download Desktop App
                </Button>
                <Link href="/how-it-works">
                  <Button
                    size="lg"
                    variant="bordered"
                    radius="full"
                    className="brand-button-secondary button-shine h-12 px-8 font-semibold"
                    endContent={<ArrowRight className="h-4 w-4" />}
                  >
                    See How it Works
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

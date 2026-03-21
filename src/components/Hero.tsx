"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import React from "react";

import { ScrollTypewriter } from "./ui/ScrollTypewriter";

export function Hero() {
  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-transparent px-4 pt-28 sm:px-6">
      <div className="container relative z-10 mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-8"
        >
          <span className="brand-chip inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium">
            <span
              className="mr-2 flex h-2 w-2 rounded-full"
              style={{
                backgroundColor: "var(--brand-highlight)",
                boxShadow: "0 0 12px rgb(var(--brand-highlight-rgb) / 0.6)",
              }}
            />
            Desktop Meeting Intelligence
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="mb-6 max-w-5xl text-5xl font-bold tracking-tight text-white md:text-7xl lg:text-8xl"
        >
          Run meetings locally. Let{" "}
          <span className="brand-gradient-text">NextStop.ai</span>
          {" "}finish the follow-up.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16 }}
          className="mb-10 max-w-2xl text-lg text-zinc-300/80 md:text-xl"
        >
          Start a structured desktop session, capture speaker-aware transcripts
          locally, and send only the finalized meeting package to a secure
          post-meeting AI pipeline for summaries, tasks, drafts, memory, and
          workspace sync.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.24 }}
          className="flex flex-col items-center gap-4 sm:flex-row"
        >
          <Button
            size="lg"
            radius="full"
            className="brand-button-primary h-12 w-full px-8 text-md font-semibold sm:w-auto"
          >
            Download Desktop App
          </Button>
          <Button
            size="lg"
            variant="bordered"
            radius="full"
            className="brand-button-secondary h-12 w-full px-8 text-md font-semibold sm:w-auto"
          >
            Explore Workflow
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.3 }}
          className="relative mt-20 w-full max-w-5xl"
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/80 p-2 shadow-2xl before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/8 before:to-transparent md:p-4">
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(to right, transparent, rgb(var(--brand-highlight-rgb) / 0.6), transparent)",
              }}
            />

            <div className="relative flex h-[400px] w-full flex-col overflow-hidden rounded-xl border border-white/5 bg-[#0a0a0a] md:h-[500px]">
              <div className="flex h-12 items-center gap-2 border-b border-white/5 bg-[#171717] px-4">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80"></div>
                  <div className="h-3 w-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="mx-auto font-mono text-xs text-zinc-500">
                  NextStop Session + Review
                </div>
              </div>

              <div className="relative flex flex-1">
                <div className="relative flex flex-1 flex-col gap-4 border-r border-white/5 p-6">
                  <div className="w-[80%] self-start rounded-xl border border-white/5 bg-zinc-900 p-4">
                    <p className="mb-1 font-mono text-xs text-zinc-500">
                      Start Session
                    </p>
                    <p className="text-sm text-zinc-300">
                      &quot;Instant Google Meet selected. Title: Release
                      readiness. Tag: Engineering. Notion destination: Launch Hub.
                      Auto-sync after finish: On.&quot;
                    </p>
                  </div>

                  <div
                    className="w-[80%] self-end rounded-xl border p-4"
                    style={{
                      borderColor: "rgb(var(--brand-primary-rgb) / 0.3)",
                      background:
                        "linear-gradient(135deg, rgb(var(--brand-primary-rgb) / 0.14), rgb(var(--brand-trust-rgb) / 0.14))",
                      boxShadow: "0 0 22px -16px rgb(var(--brand-primary-rgb) / 0.5)",
                    }}
                  >
                    <p
                      className="mb-1 flex items-center gap-2 font-mono text-xs"
                      style={{ color: "var(--brand-highlight)" }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: "var(--brand-primary)" }}
                      />
                      Post-Meeting AI
                    </p>
                    <ScrollTypewriter
                      text="Analysis complete. Summary, executive bullets, decisions, action items, risks, related-meeting memory, and a Notion-ready markdown artifact are ready for review."
                      className="text-sm text-zinc-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-40 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}

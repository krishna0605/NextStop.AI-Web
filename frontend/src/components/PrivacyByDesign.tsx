"use client";

import { motion } from "framer-motion";
import { CloudOff, Lock, Mic, Server } from "lucide-react";
import React from "react";

export function PrivacyByDesign() {
  return (
    <section className="relative overflow-hidden border-t border-white/5 bg-transparent py-24">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="brand-chip-trust mb-6 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium"
          >
            <Lock className="mr-2 h-4 w-4" />
            Security by Design
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-6 text-3xl font-bold text-white md:text-5xl"
          >
            Audio stays local.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, var(--brand-trust), var(--brand-support), var(--brand-highlight))",
              }}
            >
              Post-meeting AI runs through a secure gateway
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg text-zinc-400"
          >
            NextStop records and stores meeting audio locally first. When the
            session ends, the app sends a finalized transcript package to your
            controlled gateway, where server-side AI generates summaries, tasks,
            drafts, and memory artifacts without exposing production keys inside
            the desktop app.
          </motion.p>
        </div>

        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:items-stretch">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative w-full flex-1 overflow-hidden rounded-2xl border border-red-500/20 bg-zinc-950 p-8"
          >
            <div className="absolute right-0 top-0 rounded-bl-xl border-b border-l border-red-500/20 bg-red-500/5 p-4 font-mono text-xs text-red-500/60">
              Live cloud stream
            </div>
            <h3 className="mb-10 text-center text-xl font-bold text-white">
              Standard Copilots
            </h3>

            <div className="relative mt-12 flex flex-col items-center gap-4 pb-8">
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900">
                <span className="absolute inset-0 rounded-2xl border border-red-500/20 animate-pulse" />
                <Mic className="h-6 w-6 text-zinc-400" />
              </div>

              <div className="relative h-16 w-px bg-red-500/20">
                <motion.div
                  animate={{ y: [0, 42, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -left-[3.5px] top-1 h-2 w-2 rounded-full bg-red-500"
                />
                <motion.div
                  animate={{ y: [30, 8, 30] }}
                  transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -left-[1.5px] top-7 h-4 w-1 rounded-full bg-zinc-500"
                />
              </div>

              <div className="z-10 flex w-full flex-col items-center gap-2 rounded-2xl border border-white/10 bg-zinc-900 p-4">
                <Server className="h-6 w-6 text-red-400" />
                <p className="text-center text-xs text-zinc-500">
                  Meeting audio goes straight to
                  <br />
                  third-party cloud models
                </p>
              </div>

              <div className="mt-4 w-full rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-xs text-red-400">
                Audio leaves your machine while the meeting is still live.
                <br />
                Higher privacy and key-management risk.
              </div>
            </div>
          </motion.div>

          <div className="z-20 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-900 font-bold text-zinc-500 shadow-2xl">
            VS
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative w-full flex-1 overflow-hidden rounded-2xl border p-8 shadow-[0_0_40px_rgba(80,103,184,0.12)]"
            style={{
              borderColor: "rgb(var(--brand-trust-rgb) / 0.35)",
              background:
                "linear-gradient(135deg, rgb(var(--brand-trust-rgb) / 0.1), rgb(var(--brand-highlight-rgb) / 0.03))",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, rgb(var(--brand-trust-rgb) / 0.08), transparent 55%)",
              }}
            />
            <div
              className="absolute right-0 top-0 rounded-bl-xl border-b border-l p-4 font-mono text-xs"
              style={{
                borderColor: "rgb(var(--brand-trust-rgb) / 0.35)",
                color: "var(--brand-highlight)",
                background: "rgb(var(--brand-trust-rgb) / 0.16)",
                boxShadow: "0 0 15px rgb(var(--brand-trust-rgb) / 0.2)",
              }}
            >
              Local capture + secure gateway
            </div>
            <h3 className="mb-10 text-center text-xl font-bold text-white">
              NextStop Architecture
            </h3>

            <div className="relative mt-12 flex flex-col items-center gap-4 pb-8">
              <div
                className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border bg-zinc-900"
                style={{ borderColor: "rgb(var(--brand-trust-rgb) / 0.24)" }}
              >
                <span
                  className="absolute inset-0 rounded-2xl border"
                  style={{
                    borderColor: "rgb(var(--brand-highlight-rgb) / 0.22)",
                    boxShadow: "0 0 22px -10px rgb(var(--brand-highlight-rgb) / 0.35)",
                  }}
                />
                <Mic
                  className="h-6 w-6"
                  style={{ color: "var(--brand-trust)" }}
                />
              </div>

              <div
                className="relative h-16 w-px"
                style={{ background: "rgb(var(--brand-trust-rgb) / 0.4)" }}
              >
                <motion.div
                  animate={{ y: [0, 44, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -left-[1.5px] top-2 h-4 w-1 rounded-full"
                  style={{
                    background: "var(--brand-highlight)",
                    boxShadow: "0 0 10px rgb(var(--brand-highlight-rgb) / 0.9)",
                  }}
                />
              </div>

              <div
                className="z-10 flex w-full flex-col items-center gap-2 rounded-2xl border p-4"
                style={{
                  borderColor: "rgb(var(--brand-trust-rgb) / 0.35)",
                  background:
                    "linear-gradient(135deg, rgb(var(--brand-trust-rgb) / 0.14), rgb(var(--brand-highlight-rgb) / 0.06))",
                }}
              >
                <CloudOff
                  className="h-6 w-6"
                  style={{ color: "var(--brand-trust)" }}
                />
                <p className="text-center text-xs" style={{ color: "#dbeafe" }}>
                  Local capture, transcript history,
                  <br />
                  and finalized meeting package
                </p>
              </div>

              <div
                className="mt-4 w-full rounded-lg border p-3 text-center text-xs"
                style={{
                  borderColor: "rgb(var(--brand-trust-rgb) / 0.25)",
                  background:
                    "linear-gradient(135deg, rgb(var(--brand-trust-rgb) / 0.12), rgb(var(--brand-highlight-rgb) / 0.08))",
                  color: "#eff6ff",
                }}
              >
                OpenAI is not used live during the meeting.
                <br />
                Only the post-meeting package crosses the gateway boundary.
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

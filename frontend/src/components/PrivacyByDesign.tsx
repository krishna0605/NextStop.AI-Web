"use client";

import { motion } from "framer-motion";
import { CloudOff, FileText, Lock, Mic, Server, ShieldCheck } from "lucide-react";
import React from "react";

export function PrivacyByDesign() {
  return (
    <section className="relative overflow-hidden border-t border-white/5 bg-transparent py-24">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="brand-chip-trust mb-6 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium"
          >
            <Lock className="mr-2 h-4 w-4" />
            Trust Architecture
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading mb-6 text-3xl font-bold text-white md:text-5xl"
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

        {/* VS Comparison — simplified */}
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:items-stretch">
          {/* Standard Copilots */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative w-full flex-1 overflow-hidden rounded-2xl border border-red-500/20 bg-zinc-950 p-8"
          >
            <div className="absolute right-0 top-0 rounded-bl-xl border-b border-l border-red-500/20 bg-red-500/5 p-4 font-mono text-xs text-red-500/60">
              Live cloud stream
            </div>
            <h3 className="font-heading mb-10 text-center text-xl font-bold text-white">
              Standard Copilots
            </h3>

            <div className="relative mt-12 flex flex-col items-center gap-4 pb-8">
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900">
                <Mic className="h-6 w-6 text-zinc-400" />
              </div>

              <div className="relative h-12 w-px bg-red-500/20">
                <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/60" />
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

          {/* VS badge */}
          <div className="z-20 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-900 font-bold text-zinc-500 shadow-2xl">
            VS
          </div>

          {/* NextStop Architecture */}
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
              className="absolute right-0 top-0 rounded-bl-xl border-b border-l p-4 font-mono text-xs"
              style={{
                borderColor: "rgb(var(--brand-trust-rgb) / 0.35)",
                color: "var(--brand-highlight)",
                background: "rgb(var(--brand-trust-rgb) / 0.16)",
              }}
            >
              Local capture + secure gateway
            </div>
            <h3 className="font-heading mb-10 text-center text-xl font-bold text-white">
              NextStop Architecture
            </h3>

            <div className="relative mt-12 flex flex-col items-center gap-4 pb-8">
              <div
                className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border bg-zinc-900"
                style={{ borderColor: "rgb(var(--brand-trust-rgb) / 0.24)" }}
              >
                <Mic className="h-6 w-6" style={{ color: "var(--brand-trust)" }} />
              </div>

              <div
                className="relative h-12 w-px"
                style={{ background: "rgb(var(--brand-trust-rgb) / 0.4)" }}
              >
                <span
                  className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    background: "var(--brand-highlight)",
                    boxShadow: "0 0 8px rgb(var(--brand-highlight-rgb) / 0.7)",
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
                <CloudOff className="h-6 w-6" style={{ color: "var(--brand-trust)" }} />
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

        {/* Trust boundary flow — merged from SecurityBoundary */}
        <div className="mx-auto mt-16 max-w-5xl">
          <motion.h3
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading mb-8 text-center text-2xl font-bold text-white md:text-3xl"
          >
            A trust model users can understand
          </motion.h3>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col rounded-2xl border border-white/8 bg-zinc-950/60 md:flex-row"
          >
            <TrustFlowColumn
              eyebrow="Local zone"
              title="On your laptop"
              icon={<CloudOff className="h-5 w-5" />}
              iconColor="var(--brand-primary)"
              description="Session launch, recording, transcript history, speaker identity, and in-meeting controls stay grounded in the desktop runtime."
              rows={[
                { label: "Mic / system audio", value: "Local only" },
                { label: "Transcript history", value: "Stored on desktop" },
                { label: "Session controls", value: "HUD + review" },
              ]}
            />
            <TrustFlowColumn
              eyebrow="Trust boundary"
              title="Secure gateway"
              icon={<ShieldCheck className="h-5 w-5" />}
              iconColor="var(--brand-trust)"
              description="When the meeting ends, the finalized meeting package can be sent to the gateway for extraction, synthesis, memory, and controlled regeneration."
              rows={[
                { label: "OpenAI key", value: "Server-held" },
                { label: "Run timing", value: "After meeting end" },
                { label: "Policy", value: "Summary, tasks, memory" },
              ]}
            />
            <TrustFlowColumn
              eyebrow="Return path"
              title="Structured outputs"
              icon={<FileText className="h-5 w-5" />}
              iconColor="var(--brand-highlight)"
              description="The app gets artifacts back for review, exports, canonical markdown, Notion sync, and follow-up workflows without exposing the production key."
              rows={[
                { label: "Review", value: "Artifacts applied locally" },
                { label: "Exports", value: "Markdown + Notion routes" },
                { label: "Recovery", value: "Targeted regeneration" },
              ]}
              isLast
            />
          </motion.div>

          {/* Trust summary banner */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-6 flex flex-col gap-3 md:flex-row"
          >
            {[
              { icon: <CloudOff className="h-4 w-4" />, text: "Live meeting audio does not stream directly to OpenAI." },
              { icon: <Server className="h-4 w-4" />, text: "The secure gateway owns production AI credentials and policy." },
              { icon: <FileText className="h-4 w-4" />, text: "The desktop app receives structured outputs back for review and sync." },
            ].map((item) => (
              <div
                key={item.text}
                className="flex flex-1 items-start gap-3 rounded-xl border border-white/6 bg-zinc-950/60 px-4 py-3"
              >
                <div
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: "rgb(var(--brand-trust-rgb) / 0.14)",
                    color: "var(--brand-highlight)",
                  }}
                >
                  {item.icon}
                </div>
                <p className="text-sm leading-relaxed text-zinc-400">{item.text}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function TrustFlowColumn({
  eyebrow,
  title,
  icon,
  iconColor,
  description,
  rows,
  isLast = false,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  description: string;
  rows: { label: string; value: string }[];
  isLast?: boolean;
}) {
  return (
    <div className={`trust-flow-col ${!isLast ? "border-b border-white/6 md:border-b-0" : ""}`}>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
          {eyebrow}
        </span>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            background: `color-mix(in srgb, ${iconColor} 18%, transparent)`,
            color: iconColor,
          }}
        >
          {icon}
        </div>
      </div>

      <h4 className="font-heading mb-2 text-lg font-bold text-white text-hover-brand cursor-default">{title}</h4>
      <p className="mb-5 text-sm leading-relaxed text-zinc-400 text-hover-brand cursor-default">{description}</p>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
          >
            <span className="text-xs text-zinc-500">{row.label}</span>
            <span className="text-xs font-medium text-zinc-200">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

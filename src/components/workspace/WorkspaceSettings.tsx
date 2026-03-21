"use client";

import { motion } from "framer-motion";
import {
  BrainCircuit,
  CreditCard,
  KeyRound,
  Lock,
  Mic,
  NotebookTabs,
  PlugZap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { IntegrationRecord } from "@/lib/workspace";

const AI_MODE_KEY = "nextstop-ai-review-mode";

export function WorkspaceSettings({
  providerStatus,
  google,
  notion,
}: {
  providerStatus: {
    deepgramConfigured: boolean;
    openAiConfigured: boolean;
    aiCoreConfigured: boolean;
    huggingFaceConfigured: boolean;
    googleConfigured: boolean;
    googleRefreshConfigured: boolean;
    notionConfigured: boolean;
    transcriptDownloadsEnabled: boolean;
    transcriptStorageMode: "memory" | "disabled";
    transcriptRetentionMinutes: number;
    rawAssetRetentionHours: number;
    aiPipelineMode: "railway_remote" | "inline_legacy";
  };
  google: IntegrationRecord | null;
  notion: IntegrationRecord | null;
}) {
  const [aiMode, setAiMode] = useState<"simple" | "advanced">(() => {
    if (typeof window === "undefined") {
      return "simple";
    }

    const stored = window.localStorage.getItem(AI_MODE_KEY);
    return stored === "advanced" ? "advanced" : "simple";
  });

  function updateAiMode(nextMode: "simple" | "advanced") {
    setAiMode(nextMode);
    window.localStorage.setItem(AI_MODE_KEY, nextMode);
  }

  const cards = [
    {
      title: "AI processing",
      description:
        providerStatus.aiCoreConfigured
          ? `Railway queue is configured in ${providerStatus.aiPipelineMode} mode and Hugging Face inference is ${providerStatus.huggingFaceConfigured ? "ready" : "still pending"}.`
          : "The web app will use the inline fallback path until the remote AI core is configured.",
      icon: PlugZap,
      href: "#ai-pipeline",
    },
    {
      title: "Google workspace",
      description:
        google?.status === "connected"
          ? `Connected${google.selected_calendar_name ? ` to ${google.selected_calendar_name}` : ""}.`
          : google?.status === "error" || google?.status === "reconnect_required"
            ? "Google needs to be reconnected for this account."
            : providerStatus.googleConfigured
              ? "Google is ready to connect for this account."
              : "Google integration configuration is still incomplete.",
      icon: Mic,
      href: "/dashboard/google",
    },
    {
      title: "Notion workspace",
      description:
        notion?.status === "connected"
          ? `Connected${notion.selected_destination_name ? ` to ${notion.selected_destination_name}` : ""}.`
          : notion?.status === "needs_destination"
            ? "Connected. Choose a page or database destination to finish setup."
            : notion?.status === "error" || notion?.status === "reconnect_required"
              ? "Reconnect Notion to restore the export workspace."
            : providerStatus.notionConfigured
              ? "Notion is ready to connect for this account."
              : "Notion OAuth configuration is still incomplete.",
      icon: NotebookTabs,
      href: "/dashboard/notion",
    },
    {
      title: "Billing",
      description:
        "Website-owned billing stays in the web app. The same subscription should unlock the desktop companion too.",
      icon: CreditCard,
      href: "/plans",
    },
  ];

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
      >
        <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Settings</p>
        <h1 className="mt-1 text-3xl font-bold text-white">Workspace policy and privacy</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
          This browser workspace is designed to stay simple and privacy-first. Durable artifacts are
          stored, raw audio is time-bounded, and provider keys never surface in the user interface.
        </p>
      </motion.section>

      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">AI review mode</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Simple and advanced surfaces</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
              Simple mode keeps the review surface guided. Advanced mode highlights artifact rails,
              model badges, and regeneration controls for operators who want more visibility.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updateAiMode("simple")}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                aiMode === "simple"
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/10 bg-black/20 text-zinc-400"
              }`}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => updateAiMode("advanced")}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                aiMode === "advanced"
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/10 bg-black/20 text-zinc-400"
              }`}
            >
              Advanced
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              href={card.href}
              className="brand-card-hover block rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
              style={{ "--card-accent-rgb": "var(--brand-primary-rgb)" } as React.CSSProperties}
            >
              <div className="flex items-start gap-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <card.icon className="h-5 w-5 text-[var(--brand-primary)]" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{card.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">{card.description}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div
          id="transcript-retention"
          className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <Lock className="h-5 w-5 text-[var(--brand-highlight)]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Transcript retention policy</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Transcript storage mode is <span className="text-white">{providerStatus.transcriptStorageMode}</span>.
                Downloads are {providerStatus.transcriptDownloadsEnabled ? "enabled" : "disabled"}.
                Temporary transcripts expire after {providerStatus.transcriptRetentionMinutes} minutes, and raw
                audio expires after {providerStatus.rawAssetRetentionHours} hours.
              </p>
            </div>
          </div>
        </div>

        <div
          id="ai-pipeline"
          className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <BrainCircuit className="h-5 w-5 text-[var(--brand-support)]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">AI pipeline boundary</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Mode: {providerStatus.aiPipelineMode}. AI core is {providerStatus.aiCoreConfigured ? "configured" : "not configured"}.
                OpenAI fallback is {providerStatus.openAiConfigured ? "available" : "unavailable"}, and Deepgram ASR is {providerStatus.deepgramConfigured ? "available" : "unavailable"}.
              </p>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Hugging Face inference endpoints are {providerStatus.huggingFaceConfigured ? "configured" : "not configured"}.
                Model routing remains server-managed so the workspace stays predictable for users.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <KeyRound className="h-5 w-5 text-[var(--brand-support)]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Hidden AI controls</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Provider credentials, queue destinations, and remote inference routing stay server-side only.
                The operator sees outcomes and regeneration controls, not raw provider knobs.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <PlugZap className="h-5 w-5 text-[var(--brand-primary)]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Operational path</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Recommended deployment keeps the web app on Vercel, data on Supabase, orchestration on Railway,
                and heavy inference on Hugging Face. If Railway is unavailable, the app can still fall back inline.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

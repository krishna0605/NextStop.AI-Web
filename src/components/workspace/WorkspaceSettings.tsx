"use client";

import { motion } from "framer-motion";
import { CreditCard, KeyRound, Lock, Mic, NotebookTabs, PlugZap } from "lucide-react";
import Link from "next/link";

import type { IntegrationRecord } from "@/lib/workspace";

export function WorkspaceSettings({
  providerStatus,
  google,
  notion,
}: {
  providerStatus: {
    deepgramConfigured: boolean;
    openAiConfigured: boolean;
    googleConfigured: boolean;
    notionConfigured: boolean;
  };
  google: IntegrationRecord | null;
  notion: IntegrationRecord | null;
}) {
  const cards = [
    {
      title: "AI processing",
      description:
        providerStatus.deepgramConfigured && providerStatus.openAiConfigured
          ? "Deepgram and OpenAI are configured for the browser findings pipeline."
          : "Deepgram or OpenAI configuration is still missing for live browser processing.",
      icon: PlugZap,
      href: "#hidden-ai-controls",
    },
    {
      title: "Google workspace",
      description:
        google?.status === "connected"
          ? `Connected${google.selected_calendar_name ? ` to ${google.selected_calendar_name}` : ""}.`
          : providerStatus.googleConfigured
            ? "Google is ready to connect for this account."
            : "Google integration routing still needs to be wired.",
      icon: Mic,
      href: "/dashboard/google",
    },
    {
      title: "Notion workspace",
      description:
        notion?.status === "connected"
          ? `Connected${notion.selected_destination_name ? ` to ${notion.selected_destination_name}` : ""}.`
          : providerStatus.notionConfigured
            ? "Notion is ready to connect for this account."
            : "Notion integration routing still needs to be wired.",
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
          This browser workspace is designed to stay simple and privacy-first. Findings are stored,
          transcript text is not, and provider keys never surface in the user interface.
        </p>
      </motion.section>

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
        <Link
          href="#transcript-retention"
          className="brand-card-hover block rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
          style={{ "--card-accent-rgb": "var(--brand-highlight-rgb)" } as React.CSSProperties}
        >
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <Lock className="h-5 w-5 text-[var(--brand-highlight)]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Transcript retention policy</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-400">
                Transcript text is processed ephemerally and only survives long enough to power a
                one-time download. It is never written to Supabase or stored as a raw workspace
                asset in v1.
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="#hidden-ai-controls"
          className="brand-card-hover block rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
          style={{ "--card-accent-rgb": "var(--brand-support-rgb)" } as React.CSSProperties}
        >
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <KeyRound className="h-5 w-5 text-[var(--brand-support)]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Hidden AI controls</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-400">
                The app hides model/runtime controls from users. Routing and provider policy stay
                server-managed so the workspace remains a simple, low-friction service.
              </p>
            </div>
          </div>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div
          id="transcript-retention"
          className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
        >
          <h2 className="text-xl font-semibold text-white">Transcript retention policy</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            Transcript text is processed ephemerally and only survives long enough to power a
            one-time download. It is never written to Supabase or stored as a raw workspace asset
            in v1.
          </p>
        </div>

        <div
          id="hidden-ai-controls"
          className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
        >
          <h2 className="text-xl font-semibold text-white">Hidden AI controls</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            The app hides model/runtime controls from users. Routing and provider policy stay
            server-managed so the workspace remains a simple, low-friction service.
          </p>
        </div>
      </section>
    </div>
  );
}

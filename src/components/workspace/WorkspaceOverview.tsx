"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  ExternalLink,
  HardDrive,
  Mic,
  NotebookTabs,
  PlugZap,
  Presentation,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { AccessState, PlanCode } from "@/lib/billing";
import { PLAN_DETAILS } from "@/lib/billing";
import {
  formatWorkspaceDate,
  MEETING_SOURCE_LABELS,
  MEETING_STATUS_COPY,
  type WorkspaceOverview as WorkspaceOverviewData,
} from "@/lib/workspace";

type BrowserCapabilities = {
  displayCapture: boolean;
  microphoneCapture: boolean;
  secureContext: boolean;
};

function getStatusToneClasses(tone: "warm" | "trust" | "neutral" | "danger") {
  switch (tone) {
    case "trust":
      return "border-blue-400/20 bg-blue-500/10 text-blue-100";
    case "danger":
      return "border-red-400/20 bg-red-500/10 text-red-100";
    case "warm":
      return "border-amber-300/20 bg-amber-400/10 text-amber-50";
    default:
      return "border-white/10 bg-white/5 text-zinc-200";
  }
}

export function WorkspaceOverview({
  displayName,
  email,
  planCode,
  accessState,
  overview,
}: {
  displayName: string;
  email: string | null | undefined;
  planCode: PlanCode;
  accessState: AccessState;
  overview: WorkspaceOverviewData;
}) {
  const [capabilities] = useState<BrowserCapabilities>(() => ({
    displayCapture:
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getDisplayMedia),
    microphoneCapture:
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia),
    secureContext: typeof window !== "undefined" ? window.isSecureContext : false,
  }));

  const planInfo = PLAN_DETAILS[planCode];
  const integrationCards = [
    {
      label: "Google Workspace",
      description:
        overview.google?.status === "connected"
          ? overview.google.selected_calendar_name || "Connected and ready for Meet creation"
                  : overview.google?.status === "error" ||
                      overview.google?.status === "reconnect_required"
            ? overview.providerStatus.googleRefreshConfigured
              ? "Google needs attention. The app will try silent token refresh before requiring reconnect."
              : "Reconnect Google to restore calendar access and Meet creation."
            : "Connect Google Calendar and Meet creation",
      status:
        overview.google?.status === "connected"
          ? "Connected"
                  : overview.google?.status === "error" ||
                      overview.google?.status === "reconnect_required"
            ? "Reconnect needed"
          : overview.providerStatus.googleConfigured
            ? "Needs connection"
            : "Configuration needed",
      href: "/dashboard/google",
      icon: CalendarDays,
      accentRgb: "var(--brand-trust-rgb)",
    },
    {
      label: "Notion Workspace",
      description:
        overview.notion?.status === "connected"
          ? overview.notion.selected_destination_name || "Export destination configured"
          : overview.notion?.status === "needs_destination"
            ? "Connected. Pick a page or database destination to finish setup."
                  : overview.notion?.status === "error" ||
                      overview.notion?.status === "reconnect_required"
            ? "Reconnect Notion to restore the export workspace."
          : "Configure page-first or database-first exports",
      status:
        overview.notion?.status === "connected"
          ? "Connected"
          : overview.notion?.status === "needs_destination"
            ? "Destination needed"
                  : overview.notion?.status === "error" ||
                      overview.notion?.status === "reconnect_required"
            ? "Reconnect needed"
          : overview.providerStatus.notionConfigured
            ? "Needs connection"
            : "Configuration needed",
      href: "/dashboard/notion",
      icon: NotebookTabs,
      accentRgb: "var(--brand-primary-rgb)",
    },
    {
      label: "Browser Capture",
      description: capabilities.displayCapture
        ? "Use the floating capture island to share any active meeting tab."
        : "Display/tab capture is not available in this browser yet.",
      status: capabilities.displayCapture ? "Tab sharing ready" : "Permission/API limited",
      href: "#workspace-capture-island",
      icon: Mic,
      accentRgb: "var(--brand-highlight-rgb)",
    },
    {
      label: "AI Pipeline",
      description:
        overview.providerStatus.deepgramConfigured && overview.providerStatus.openAiConfigured
          ? "Managed findings pipeline is configured on the server."
          : "Deepgram or OpenAI keys are still missing for live processing.",
      status:
        overview.providerStatus.deepgramConfigured && overview.providerStatus.openAiConfigured
          ? "Configured"
          : "Needs configuration",
      href: "/dashboard/settings",
      icon: PlugZap,
      accentRgb: "var(--brand-support-rgb)",
    },
  ];

  const recentCards = useMemo(
    () =>
      overview.meetings.slice(0, 4).map((meeting) => ({
        meeting,
        findings: overview.findingsByMeetingId[meeting.id],
      })),
    [overview]
  );

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="brand-surface-card rounded-[2rem]"
        style={{ "--surface-rgb": "var(--brand-primary-rgb)" } as React.CSSProperties}
      >
        <div className="brand-surface-frame rounded-[inherit] p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="brand-chip mb-4 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium">
                <Sparkles className="mr-2 h-4 w-4" />
                Browser Workspace
              </div>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">
                Welcome back, <span className="brand-gradient-text">{displayName}</span>
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-300">
                The web workspace keeps the product simple: launch a meeting, capture the shared
                browser tab, generate privacy-first findings, and export only what matters.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-zinc-300">
                <span className="brand-surface-chip rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  Plan: {planInfo.label}
                </span>
                <span className="brand-surface-chip rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  Access: {accessState}
                </span>
                {email ? (
                  <span className="brand-surface-chip rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                    {email}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
              <Link href="#workspace-capture-island">
                <Button
                  radius="full"
                  className="brand-button-primary h-12 w-full font-semibold"
                  endContent={<ArrowRight className="h-4 w-4" />}
                >
                  Open Capture Controls
                </Button>
              </Link>
              <Link href="/plans">
                <Button
                  radius="full"
                  className="brand-button-secondary h-12 w-full font-semibold"
                  startContent={<CreditCard className="h-4 w-4" />}
                >
                  Manage Plan
                </Button>
              </Link>
              <Link href="/dashboard/google">
                <Button radius="full" className="brand-button-secondary h-12 w-full font-semibold">
                  Create Google Meet
                </Button>
              </Link>
              <Link href="/dashboard/library">
                <Button radius="full" className="brand-button-secondary h-12 w-full font-semibold">
                  Open Findings Library
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.95fr]">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
                Workspace readiness
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">Integrations and capture</h2>
            </div>
            <Link href="/dashboard/settings" className="brand-link text-sm text-zinc-400">
              Open settings
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {integrationCards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="brand-card-hover rounded-2xl border border-white/10 bg-black/30 p-5"
                style={{ "--card-accent-rgb": card.accentRgb } as React.CSSProperties}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, rgb(${card.accentRgb} / 0.24), rgb(${card.accentRgb} / 0.08))`,
                    }}
                  >
                    <card.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                    {card.status}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white">{card.label}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{card.description}</p>
              </Link>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
        >
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Global capture</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Use the floating controller</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            The dynamic island now follows you across Dashboard, Library, Google, Notion, Settings,
            and Review. Start from there to pick a meeting tab, record it, and send findings into
            Library automatically.
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Controls</p>
              <p className="mt-3 text-sm leading-7 text-zinc-300">
                Instant Google Meet, Start, Pause or Resume, End, and Sync to Notion are all in the
                floating island. You no longer need a dedicated capture page.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">How capture works</p>
              <p className="mt-3 text-sm leading-7 text-zinc-300">
                Clicking Start opens the browser share picker, lets you choose the active meeting
                tab, and begins transcription and findings processing only for that shared tab.
              </p>
            </div>

            <Link href="#workspace-capture-island" className="block">
              <Button
                radius="full"
                className="brand-button-primary h-12 w-full font-semibold"
                endContent={<ArrowRight className="h-4 w-4" />}
              >
                Jump to Capture Controls
              </Button>
            </Link>
          </div>
        </motion.section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Recent findings</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Saved summaries only</h2>
            </div>
            <Link href="/dashboard/library" className="brand-link text-sm text-zinc-400">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {recentCards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-5 py-10 text-center text-sm text-zinc-500">
                No saved findings yet. Start a browser meeting and keep only the summary bundle.
              </div>
            ) : (
              recentCards.map(({ meeting, findings }) => {
                const meetingStatus = MEETING_STATUS_COPY[meeting.status];
                return (
                  <Link
                    key={meeting.id}
                    href={`/dashboard/review/${meeting.id}`}
                    className="brand-card-hover block rounded-2xl border border-white/10 bg-black/20 p-4"
                    style={{ "--card-accent-rgb": "var(--brand-primary-rgb)" } as React.CSSProperties}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-lg font-semibold text-white">
                            {meeting.title}
                          </h3>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs ${getStatusToneClasses(meetingStatus.tone)}`}
                          >
                            {meetingStatus.label}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-400">
                          {MEETING_SOURCE_LABELS[meeting.source_type]} | {formatWorkspaceDate(meeting.created_at)}
                        </p>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-300">
                          {findings?.summary_short ?? meetingStatus.description}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 shrink-0 text-zinc-500" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16 }}
          className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
        >
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Privacy + companion</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Browser-first, desktop-ready</h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-[var(--brand-highlight)]" />
                <div>
                  <p className="font-medium text-white">Transcript is not stored</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Only findings, summaries, and export metadata remain in Supabase. Transcript
                    access stays ephemeral and can be disabled entirely in production.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start gap-3">
                <Presentation className="mt-0.5 h-5 w-5 text-[var(--brand-primary)]" />
                <div>
                  <p className="font-medium text-white">Desktop companion</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Use the same subscription on desktop if you want stronger local capture, tray
                    controls, and a more native recording experience.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link href="/" className="block">
                <Button
                  radius="full"
                  className="brand-button-secondary h-11 w-full font-semibold"
                  startContent={<HardDrive className="h-4 w-4" />}
                >
                  Download desktop
                </Button>
              </Link>
              <Link href="/dashboard/settings" className="block">
                <Button
                  radius="full"
                  className="brand-button-secondary h-11 w-full font-semibold"
                  startContent={<ExternalLink className="h-4 w-4" />}
                >
                  Open settings
                </Button>
              </Link>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-zinc-400">
              Capture APIs:{" "}
              <span className="text-zinc-200">
                {capabilities.displayCapture ? "tab sharing available" : "tab sharing unavailable"}
              </span>
              {" | "}
              <span className="text-zinc-200">
                {capabilities.microphoneCapture ? "microphone available" : "microphone unavailable"}
              </span>
              {" | "}
              <span className="text-zinc-200">
                {capabilities.secureContext ? "secure context" : "not secure"}
              </span>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

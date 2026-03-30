"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  CheckCircle2,
  NotebookTabs,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { useWorkspaceCaptureController } from "@/components/workspace/WorkspaceCaptureIsland";
import type { AccessState, PlanCode } from "@/lib/billing";
import { PLAN_DETAILS } from "@/lib/billing";
import type { WorkspaceOverview as WorkspaceOverviewData } from "@/lib/workspace";

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
  const planInfo = PLAN_DETAILS[planCode];
  const { openCaptureControls } = useWorkspaceCaptureController();
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
  ];

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
                NextStop keeps the workflow simple: connect your tools, start capture from the
                sidebar controls, and keep only the final findings bundle that matters.
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
              <Link href="/dashboard/google">
                <Button
                  radius="full"
                  className="brand-button-primary h-12 w-full font-semibold"
                  endContent={<ArrowRight className="h-4 w-4" />}
                >
                  Open Google Setup
                </Button>
              </Link>
              <Link href="/dashboard/notion">
                <Button
                  radius="full"
                  className="brand-button-secondary h-12 w-full font-semibold"
                  endContent={<ArrowRight className="h-4 w-4" />}
                >
                  Open Notion Setup
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
              <Button
                radius="full"
                onPress={openCaptureControls}
                className="brand-button-secondary h-12 w-full font-semibold"
              >
                  Open Capture Controls
              </Button>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
        >
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Account overview
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Plan and workspace status</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            This page focuses on the basics: what plan you are on, whether your integrations are
            ready, and what to do next.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Current plan</p>
              <p className="mt-3 text-2xl font-semibold text-white">{planInfo.label}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{planInfo.description}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Access state</p>
              <p className="mt-3 text-2xl font-semibold capitalize text-white">
                {accessState.replace(/_/g, " ")}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Billing and workspace access stay synced from the same account profile.
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
        >
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">How it works</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Simple browser-first workflow</h2>

          <div className="mt-6 space-y-4">
            {[
              "Connect Google if you want instant Meet creation or scheduled meetings.",
              "Connect Notion if you want one-click export of findings to a page or database.",
              "Use the sidebar capture controls to start, pause, resume, and end a browser-tab capture.",
              "Review the findings in Library after capture finishes.",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-highlight)]" />
                <p className="text-sm leading-7 text-zinc-300">{item}</p>
              </div>
            ))}
          </div>
        </motion.section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
                Connections
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">Google and Notion status</h2>
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
          transition={{ duration: 0.35, delay: 0.16 }}
          className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
        >
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">What to do next</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Quick next steps</h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Recommended flow</p>
              <p className="mt-3 text-sm leading-7 text-zinc-300">
                First connect Google and Notion, then use the sidebar capture controls,
                and finally open Library to review and export findings.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link href="/dashboard/library" className="block">
                <Button
                  radius="full"
                  className="brand-button-secondary h-11 w-full font-semibold"
                >
                  Open Library
                </Button>
              </Link>
              <Button
                radius="full"
                onPress={openCaptureControls}
                className="brand-button-primary h-11 w-full font-semibold"
                endContent={<ArrowRight className="h-4 w-4" />}
              >
                Open Capture Controls
              </Button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm leading-6 text-zinc-400">
              The sidebar capture panel stays available across Dashboard, Library, Google, Notion,
              Settings, and Review, so you do not need a separate capture page.
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

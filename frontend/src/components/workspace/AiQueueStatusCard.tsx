import { Activity, AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import Link from "next/link";

import type { DashboardHomeData } from "@/lib/workspace";
import { formatWorkspaceDateStable } from "@/lib/workspace";

function getQueueState(overview: DashboardHomeData) {
  const { aiQueueStatus, latestAiJob, providerStatus } = overview;
  const activeCount = aiQueueStatus.queuedCount + aiQueueStatus.runningCount;

  if (!providerStatus.aiCoreConfigured) {
    return {
      label: "Unknown",
      detail: "AI core health is not configured in this runtime.",
      className: "border-zinc-400/20 bg-white/5 text-zinc-200",
      icon: <Clock3 className="h-5 w-5" />,
    };
  }

  if (aiQueueStatus.cancelRequestedCount > 0 || latestAiJob?.status === "cancel_requested") {
    return {
      label: "Blocked",
      detail: "One or more jobs are waiting for a safe cancellation checkpoint.",
      className: "border-red-400/20 bg-red-500/10 text-red-100",
      icon: <AlertTriangle className="h-5 w-5" />,
    };
  }

  if (aiQueueStatus.failedCount > 0 || latestAiJob?.status === "failed") {
    return {
      label: "Degraded",
      detail: "Recent AI failures need review before launch confidence is high.",
      className: "border-amber-300/20 bg-amber-400/10 text-amber-50",
      icon: <AlertTriangle className="h-5 w-5" />,
    };
  }

  if (activeCount > 5) {
    return {
      label: "Busy",
      detail: "The queue is moving, but active work is elevated.",
      className: "border-blue-300/20 bg-blue-400/10 text-blue-50",
      icon: <Activity className="h-5 w-5" />,
    };
  }

  return {
    label: "Healthy",
    detail: "AI jobs are within the expected operating range.",
    className: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    icon: <CheckCircle2 className="h-5 w-5" />,
  };
}

export function AiQueueStatusCard({ overview }: { overview: DashboardHomeData }) {
  const state = getQueueState(overview);
  const latest = overview.latestAiJob;

  return (
    <section
      aria-live="polite"
      className={`rounded-[2rem] border p-6 ${state.className}`}
      aria-label="AI processing status"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] opacity-75">AI processing status</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-white">
            {state.icon}
            {state.label}
          </h2>
          <p className="mt-3 text-sm leading-6 opacity-90">{state.detail}</p>
        </div>
        <Link href="/dashboard/ops" className="brand-link text-sm text-zinc-300">
          Open Ops
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] opacity-70">Queued</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {overview.aiQueueStatus.queuedCount}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] opacity-70">Running</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {overview.aiQueueStatus.runningCount}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] opacity-70">Failed</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {overview.aiQueueStatus.failedCount}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] opacity-70">Canceling</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {overview.aiQueueStatus.cancelRequestedCount}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 opacity-75">
        Latest job:{" "}
        {latest
          ? `${latest.job_type.replace(/_/g, " ")} / ${latest.status.replace(/_/g, " ")} / ${formatWorkspaceDateStable(latest.created_at)}`
          : "No AI job has been recorded for this account yet."}
      </p>
    </section>
  );
}

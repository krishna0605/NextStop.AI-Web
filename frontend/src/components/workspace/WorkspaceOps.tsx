"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, ExternalLink, ServerCog, XCircle } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import type { OpsReadinessData } from "@/lib/workspace";
import { formatWorkspaceDate, formatWorkspaceDateStable } from "@/lib/workspace";

function WorkspaceDateText({
  value,
  className = "",
}: {
  value: string | null | undefined;
  className?: string;
}) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  return (
    <span className={className} suppressHydrationWarning>
      {mounted ? formatWorkspaceDate(value) : formatWorkspaceDateStable(value)}
    </span>
  );
}

function toneClass(status: "pass" | "warn" | "fail") {
  switch (status) {
    case "pass":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
    case "warn":
      return "border-amber-300/20 bg-amber-400/10 text-amber-50";
    default:
      return "border-red-400/20 bg-red-500/10 text-red-100";
  }
}

function toneIcon(status: "pass" | "warn" | "fail") {
  switch (status) {
    case "pass":
      return <CheckCircle2 className="h-4 w-4" />;
    case "warn":
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return <XCircle className="h-4 w-4" />;
  }
}

function launchToneClass(decision: "ready" | "degraded" | "blocked") {
  switch (decision) {
    case "ready":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
    case "degraded":
      return "border-amber-300/20 bg-amber-400/10 text-amber-50";
    default:
      return "border-red-400/20 bg-red-500/10 text-red-100";
  }
}

function verificationToneClass(
  status:
    | "unknown"
    | "pass"
    | "fail"
    | "blocked"
    | "partial"
    | "pending"
    | "certified"
) {
  switch (status) {
    case "pass":
    case "certified":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
    case "partial":
    case "pending":
    case "unknown":
      return "border-amber-300/20 bg-amber-400/10 text-amber-50";
    default:
      return "border-red-400/20 bg-red-500/10 text-red-100";
  }
}

function verificationStatusLabel(
  status:
    | "unknown"
    | "pass"
    | "fail"
    | "blocked"
    | "partial"
    | "pending"
    | "certified"
) {
  switch (status) {
    case "pass":
      return "Passed";
    case "partial":
      return "Partial";
    case "certified":
      return "Certified";
    case "pending":
      return "Pending";
    case "blocked":
      return "Blocked";
    case "fail":
      return "Failed";
    default:
      return "Unknown";
  }
}

function formatOpaqueId(value: string) {
  return value.slice(0, 8);
}

export function WorkspaceOps({ data }: { data: OpsReadinessData }) {
  const observabilityLinks = [
    {
      label: "Open Grafana Overview",
      href: data.observabilityLinks.grafanaOverviewUrl,
      description: "Metrics, dashboards, and alert state in Grafana.",
    },
    {
      label: "Open Grafana Logs",
      href: data.observabilityLinks.grafanaLogsUrl,
      description: "Structured backend, worker, and cleanup logs in Loki.",
    },
    {
      label: "Open Grafana Traces",
      href: data.observabilityLinks.grafanaTracesUrl,
      description: "Distributed traces routed through Tempo.",
    },
    {
      label: "Open Sentry Issues",
      href: data.observabilityLinks.sentryIssuesUrl,
      description: "Frontend and backend issue workflows in Sentry.",
    },
    {
      label: "Open Synthetic Monitoring",
      href: data.observabilityLinks.syntheticMonitoringUrl,
      description: "Production canaries and uptime verification.",
    },
  ].filter((item): item is { label: string; href: string; description: string } => Boolean(item.href));

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Operations</p>
            <h1 className="mt-1 text-3xl font-bold text-white">Production readiness</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
              This internal surface is intentionally summary-only. It exposes launch posture,
              worker health, cleanup freshness, and high-signal counts, while raw logs, traces,
              and stack traces stay in separately authenticated observability tools.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Launch decision</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {data.launchDecision === "ready"
                  ? "Ready"
                  : data.launchDecision === "degraded"
                    ? "Degraded"
                    : "Blocked"}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {data.blockingFailures.length > 0
                  ? `${data.blockingFailures.length} blocking failure(s)`
                  : data.warnings.length > 0
                    ? `${data.warnings.length} warning(s)`
                    : "All tracked launch checks are green."}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">AI worker</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {data.workerReady ? "Healthy" : "Needs attention"}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {data.queueName ? `Queue: ${data.queueName}` : "Queue unavailable"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Hosted verification
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {verificationStatusLabel(
                  data.hostedVerification?.lastHostedVerificationStatus ?? "unknown"
                )}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {data.hostedVerification?.lastHostedVerificationAt ? (
                  <>
                    Last run <WorkspaceDateText value={data.hostedVerification.lastHostedVerificationAt} />
                  </>
                ) : (
                  "No hosted verification recorded yet"
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Launch certification
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {verificationStatusLabel(
                  data.launchCertification?.lastLaunchCertificationStatus ?? "pending"
                )}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {data.launchCertification?.lastLaunchCertificationAt ? (
                  <>
                    Updated{" "}
                    <WorkspaceDateText value={data.launchCertification.lastLaunchCertificationAt} />
                  </>
                ) : (
                  "Launch certification has not been issued yet"
                )}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div
          className={`rounded-[2rem] border p-6 ${launchToneClass(data.launchDecision)}`}
        >
          <p className="text-sm uppercase tracking-[0.22em] opacity-80">Launch posture</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Current release gate</h2>
          <p className="mt-4 text-sm leading-7 opacity-90">
            {data.launchDecision === "ready"
              ? "The tracked production gates are green."
              : data.launchDecision === "degraded"
                ? "The system can operate, but fallback or warning states are active."
                : "The system should not be treated as fully production-ready until the blocking checks are resolved."}
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Worker version</p>
              <p className="mt-2 font-medium text-white">{data.workerVersion ?? "Unknown"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Last heartbeat</p>
              <p className="mt-2 font-medium text-white">
                {data.lastWorkerHeartbeatAt ? (
                  <WorkspaceDateText value={data.lastWorkerHeartbeatAt} />
                ) : (
                  "Unknown"
                )}
              </p>
              <p className="mt-1 text-sm text-zinc-400">{data.lastDeployHint}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <div className="flex items-center gap-3">
            <ServerCog className="h-5 w-5 text-[var(--brand-primary)]" />
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Runtime boundary</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Owned endpoints and runtimes</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm text-zinc-300">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="font-medium text-white">App URL</p>
              <p className="mt-1 break-all text-zinc-400">{data.appUrl}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="font-medium text-white">Backend URL</p>
              <p className="mt-1 break-all text-zinc-400">{data.backendApiUrl ?? "Not configured"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="font-medium text-white">AI core URL</p>
              <p className="mt-1 break-all text-zinc-400">{data.aiCoreApiUrl ?? "Not configured"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Readiness checks</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Current health summary</h2>
          <div className="mt-5 space-y-3">
            {data.checks.map((check) => (
              <div
                key={check.name}
                className={`rounded-2xl border px-4 py-3 text-sm ${toneClass(check.status)}`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {toneIcon(check.status)}
                  {check.name}
                </div>
                <p className="mt-2 leading-6 opacity-90">{check.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Blocking failures</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Launch blockers</h2>
          <div className="mt-5 space-y-3">
            {data.blockingFailures.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-zinc-500">
                No blocking failures are active.
              </div>
            ) : (
              data.blockingFailures.map((issue) => (
                <div
                  key={issue.name}
                  className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100"
                >
                  <p className="font-medium text-white">{issue.name}</p>
                  <p className="mt-2 leading-6">{issue.detail}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Warnings</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Degraded but operating</h2>
          <div className="mt-5 space-y-3">
            {data.warnings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-zinc-500">
                No active launch warnings were found.
              </div>
            ) : (
              data.warnings.map((issue) => (
                <div
                  key={issue.name}
                  className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50"
                >
                  <p className="font-medium text-white">{issue.name}</p>
                  <p className="mt-2 leading-6">{issue.detail}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Operational summaries</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Recent incident counts</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">AI failures</p>
              <p className="mt-2 text-2xl font-semibold text-white">{data.recentAiFailures.length}</p>
              <p className="mt-1 text-sm text-zinc-400">
                {data.recentAiFailures[0]?.createdAt ? (
                  <>
                    Latest <WorkspaceDateText value={data.recentAiFailures[0].createdAt} />
                  </>
                ) : (
                  "No failed AI jobs in the current summary window."
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Degraded meetings
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {data.recentDegradedMeetings.length}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {data.recentDegradedMeetings[0]?.updatedAt ? (
                  <>
                    Latest <WorkspaceDateText value={data.recentDegradedMeetings[0].updatedAt} />
                  </>
                ) : (
                  "No degraded meetings in the current summary window."
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Export failures</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {data.recentExportFailures.length}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {data.recentExportFailures[0]?.createdAt ? (
                  <>
                    Latest <WorkspaceDateText value={data.recentExportFailures[0].createdAt} />
                  </>
                ) : (
                  "No failed exports in the current summary window."
                )}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {data.recentAiFailures.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-white">
                    {item.jobType.replace(/_/g, " ")} · {item.stage.replace(/_/g, " ")}
                  </span>
                  <WorkspaceDateText value={item.createdAt} className="text-red-200/70" />
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-red-200/70">
                  Meeting {formatOpaqueId(item.meetingId)} · {item.executionMode ?? "unknown mode"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Safe investigation links</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Open the external tools</h2>
          <div className="mt-5 space-y-3">
            {observabilityLinks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-zinc-500">
                Observability links are not configured yet. Add the Grafana and Sentry URLs in the deployment environment before using this console in production.
              </div>
            ) : (
              observabilityLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300 transition hover:border-white/20 hover:text-white"
                >
                  <div className="flex items-center gap-2 font-medium text-white">
                    <ExternalLink className="h-4 w-4" />
                    {item.label}
                  </div>
                  <p className="mt-2 leading-6 text-zinc-400">{item.description}</p>
                </a>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Hosted verification</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Deployment proof summary</h2>
          <div className="mt-5 space-y-3 text-sm text-zinc-300">
            <div
              className={`rounded-2xl border px-4 py-3 ${verificationToneClass(
                data.hostedVerification?.lastHostedVerificationStatus ?? "unknown"
              )}`}
            >
              <p className="font-medium text-white">
                {verificationStatusLabel(
                  data.hostedVerification?.lastHostedVerificationStatus ?? "unknown"
                )}
              </p>
              <p className="mt-2">
                {data.hostedVerification?.lastHostedVerificationFailureReason ??
                  "Hosted verification results are persisted from the post-deploy workflow and manual certification runs."}
              </p>
              <p className="mt-2 text-zinc-300/80">
                Source: {data.hostedVerification?.source ?? "Not recorded"}
              </p>
            </div>
            {Object.entries(data.hostedVerification?.scenarios ?? {}).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-zinc-500">
                Scenario-level hosted verification has not been recorded yet.
              </div>
            ) : (
              Object.entries(data.hostedVerification?.scenarios ?? {}).map(([name, scenario]) => (
                <div
                  key={name}
                  className={`rounded-2xl border px-4 py-3 ${verificationToneClass(scenario.status)}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-white">{name.replace(/_/g, " ")}</span>
                    <span>{verificationStatusLabel(scenario.status)}</span>
                  </div>
                  {scenario.detail ? <p className="mt-2 leading-6">{scenario.detail}</p> : null}
                  {scenario.checkedAt ? (
                    <p className="mt-2 text-zinc-300/80">
                      Checked <WorkspaceDateText value={scenario.checkedAt} />
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Launch certification</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Current sign-off state</h2>
          <div className="mt-5 space-y-3 text-sm text-zinc-300">
            <div
              className={`rounded-2xl border px-4 py-3 ${verificationToneClass(
                data.launchCertification?.lastLaunchCertificationStatus ?? "pending"
              )}`}
            >
              <p className="font-medium text-white">
                {verificationStatusLabel(
                  data.launchCertification?.lastLaunchCertificationStatus ?? "pending"
                )}
              </p>
              <p className="mt-2 leading-6">
                {data.launchCertification?.certificationNotes ??
                  "Launch certification is pending until validation, hosted verification, and ops proof are complete."}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="font-medium text-white">Certified by</p>
              <p className="mt-2 text-zinc-400">
                {data.launchCertification?.certifiedBy ?? "No certification owner recorded"}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Validation</p>
                <p className="mt-2 font-medium text-white">
                  {data.launchCertification?.validationGreen ? "Green" : "Pending"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Hosted proof
                </p>
                <p className="mt-2 font-medium text-white">
                  {data.launchCertification?.hostedVerificationPassed ? "Complete" : "Pending"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Ops proof</p>
                <p className="mt-2 font-medium text-white">
                  {data.launchCertification?.operationalProofComplete ? "Complete" : "Pending"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Capture runtime</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Finalization and backlog view</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Active sessions</p>
              <p className="mt-2 font-medium text-white">
                {data.captureRuntime.activeCaptureSessionCount}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Stale sessions</p>
              <p className="mt-2 font-medium text-white">
                {data.captureRuntime.staleCaptureSessionCount}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Finalization backlog
              </p>
              <p className="mt-2 font-medium text-white">
                {data.captureRuntime.finalizationBacklogCount}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Transcript-ready awaiting analysis
              </p>
              <p className="mt-2 font-medium text-white">
                {data.captureRuntime.transcriptReadyAwaitingAnalysisCount}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Cancel-requested jobs
              </p>
              <p className="mt-2 font-medium text-white">
                {data.captureRuntime.cancelRequestedJobCount}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Cleanup and retention</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Asset lifecycle</h2>
          <div className="mt-5 space-y-3 text-sm text-zinc-300">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="font-medium text-white">Last cleanup run</p>
              <p className="mt-2 text-zinc-400">
                {data.cleanup?.lastCleanupRunAt ? (
                  <WorkspaceDateText value={data.cleanup.lastCleanupRunAt} />
                ) : (
                  "Unknown"
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="font-medium text-white">Last successful cleanup</p>
              <p className="mt-2 text-zinc-400">
                {data.cleanup?.lastCleanupSuccessAt ? (
                  <WorkspaceDateText value={data.cleanup.lastCleanupSuccessAt} />
                ) : (
                  "No successful cleanup recorded"
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="font-medium text-white">Deleted assets</p>
              <p className="mt-2 text-zinc-400">
                Audio: {data.cleanup?.deletedAudioAssetCount ?? 0} · Transcript:{" "}
                {data.cleanup?.deletedTranscriptAssetCount ?? 0}
              </p>
              <p className="mt-1 text-zinc-500">
                Pending expired assets: {data.cleanup?.pendingExpiredAssetCount ?? 0}
              </p>
            </div>
            {data.cleanup?.lastCleanupError ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-100">
                Cleanup error: {data.cleanup.lastCleanupError}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Security controls</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Sensitive route protection</h2>
          <div className="mt-5 space-y-3 text-sm text-zinc-300">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="font-medium text-white">Rate-limit denials</p>
              <p className="mt-2 text-zinc-400">{data.security?.rateLimitDeniedCount ?? 0}</p>
              <p className="mt-1 text-zinc-500">
                Last denial:{" "}
                {data.security?.lastRateLimitDeniedAt ? (
                  <WorkspaceDateText value={data.security.lastRateLimitDeniedAt} />
                ) : (
                  "No denials recorded"
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="font-medium text-white">Transcript route decisions</p>
              <p className="mt-2 text-zinc-400">
                Granted: {data.security?.transcriptDownloadGrantedCount ?? 0} · Blocked:{" "}
                {data.security?.transcriptDownloadBlockedCount ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="font-medium text-white">Export requests observed</p>
              <p className="mt-2 text-zinc-400">{data.security?.exportRequestedCount ?? 0}</p>
              <p className="mt-1 text-zinc-500">
                Last request:{" "}
                {data.security?.lastExportRequestedAt ? (
                  <WorkspaceDateText value={data.security.lastExportRequestedAt} />
                ) : (
                  "No exports recorded"
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Recent export failures</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Retry counts without payload details</h2>
          <div className="mt-5 space-y-3">
            {data.recentExportFailures.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-zinc-500">
                No recent failed exports were found for this workspace.
              </div>
            ) : (
              data.recentExportFailures.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-white">
                      {item.exportType.replace(/_/g, " ")}
                    </span>
                    <WorkspaceDateText value={item.createdAt} className="text-amber-100/70" />
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-amber-100/70">
                    Meeting {formatOpaqueId(item.meetingId)}
                    {item.destination ? " · destination configured" : ""}
                    {typeof item.durationMs === "number" ? ` · ${item.durationMs} ms` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
        <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Capture sessions</p>
        <h2 className="mt-1 text-xl font-semibold text-white">Recent finalize and capture activity</h2>
        <div className="mt-5 space-y-3">
          {data.captureRuntime.sessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-zinc-500">
              No recent capture sessions were found for this workspace.
            </div>
          ) : (
            data.captureRuntime.sessions.map((session) => (
              <div
                key={session.captureSessionId}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-medium text-white">
                      Meeting {formatOpaqueId(session.meetingId)}
                    </p>
                    <p className="mt-1 text-zinc-400">
                      {session.status.replace(/_/g, " ")} · {session.totalChunksReceived} chunks ·{" "}
                      {session.totalBytesReceived} bytes
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                      Last heartbeat:{" "}
                      {session.lastHeartbeatAt ? (
                        <WorkspaceDateText value={session.lastHeartbeatAt} />
                      ) : (
                        "None"
                      )}
                    </div>
                    <Link
                      href={`/dashboard/review/${session.meetingId}`}
                      className="brand-link text-sm text-zinc-400"
                    >
                      Open meeting
                    </Link>
                  </div>
                </div>
                {session.lastChunkReceivedAt ? (
                  <p className="mt-2 text-zinc-500">
                    Last chunk <WorkspaceDateText value={session.lastChunkReceivedAt} />
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Next actions</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Deployment and recovery links</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/settings" className="brand-link text-sm text-zinc-400">
              Workspace settings
            </Link>
            <Link href="/dashboard/library" className="brand-link text-sm text-zinc-400">
              Open library
            </Link>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <a
            href={data.appUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300 transition hover:border-white/20 hover:text-white"
          >
            <div className="flex items-center gap-2 font-medium text-white">
              <ExternalLink className="h-4 w-4" />
              Open app root
            </div>
            <p className="mt-2 break-all text-zinc-400">{data.appUrl}</p>
          </a>
          {data.backendApiUrl ? (
            <a
              href={data.backendApiUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300 transition hover:border-white/20 hover:text-white"
            >
              <div className="flex items-center gap-2 font-medium text-white">
                <ExternalLink className="h-4 w-4" />
                Open backend
              </div>
              <p className="mt-2 break-all text-zinc-400">{data.backendApiUrl}</p>
            </a>
          ) : null}
        </div>
      </section>
    </div>
  );
}

"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import {
  Clipboard,
  Download,
  ExternalLink,
  FileDown,
  Mail,
  RotateCcw,
  ShieldCheck,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { deriveStructuredMeetingContent } from "@/lib/meeting-artifacts";
import { resolvePublicApiUrl } from "@/lib/public-backend";
import {
  getMeetingSurfaceState,
  getSurfaceStatePresentation,
  getTranscriptLifecycleCopy,
} from "@/lib/workspace-status";
import type {
  AiStatusSnapshot,
  IntegrationRecord,
  MeetingArtifactRecord,
  MeetingExportRecord,
  MeetingFindingsRecord,
  TranscriptAvailability,
  WebMeetingRecord,
} from "@/lib/workspace";
import {
  formatWorkspaceDate,
  formatWorkspaceDateStable,
  MEETING_SOURCE_LABELS,
} from "@/lib/workspace";

function renderList(items: string[] | null | undefined, fallback: string) {
  const normalized = items?.filter(Boolean) ?? [];
  return (normalized.length > 0 ? normalized : [fallback]).map((item) => (
    <li key={item}>- {item}</li>
  ));
}

async function downloadBlob(filename: string, response: Response) {
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

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

export function MeetingReview({
  meeting,
  findings,
  artifacts,
  aiStatus,
  exports,
  notion,
  transcriptAvailability,
  providerStatus,
}: {
  meeting: WebMeetingRecord;
  findings: MeetingFindingsRecord | null;
  artifacts: MeetingArtifactRecord[];
  aiStatus: AiStatusSnapshot | null;
  exports: MeetingExportRecord[];
  notion: IntegrationRecord | null;
  transcriptAvailability: TranscriptAvailability;
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
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    "pdf" | "transcript" | "notion" | "cancel" | null
  >(null);
  const notionReady = notion?.status === "connected";
  const surfaceState = getMeetingSurfaceState({ meeting, findings, aiStatus });
  const statePresentation = getSurfaceStatePresentation(
    surfaceState,
    findings?.generation_status ?? aiStatus?.findingsGenerationStatus
  );
  const generationMode = findings?.generation_mode ?? aiStatus?.findingsGenerationMode ?? null;
  const generationStatus =
    findings?.generation_status ?? aiStatus?.findingsGenerationStatus ?? null;
  const fallbackReason = findings?.fallback_reason ?? aiStatus?.findingsFallbackReason ?? null;
  const transcriptLifecycleLabel = getTranscriptLifecycleCopy(transcriptAvailability);
  const cancelable = Boolean(aiStatus?.cancelable);
  const findingsPending =
    meeting.status === "finalizing_upload" ||
    meeting.status === "queued" ||
    meeting.status === "transcribing" ||
    meeting.status === "transcript_ready" ||
    meeting.status === "analyzing" ||
    meeting.status === "cancel_requested";
  const actionabilityLabel =
    surfaceState === "needs_retry"
      ? "Retry required before exports are trustworthy."
      : findings
        ? transcriptAvailability.downloadEnabled
          ? "Export-ready with transcript access."
          : "Export-ready with transcript-limited policy."
        : meeting.status === "cancel_requested"
          ? "Processing is being stopped at the next safe checkpoint."
          : "Findings are still being assembled.";
  const extractionModeLabel =
    generationMode === "fallback_local"
      ? "Fallback mode"
      : generationMode === "openai_primary"
        ? "Primary model path"
        : "Awaiting extraction";
  const shouldExplainState = surfaceState === "degraded" || surfaceState === "needs_retry";
  const stateExplanation =
    surfaceState === "degraded"
      ? fallbackReason?.trim()
        ? fallbackReason
        : "The primary AI path did not complete, so NextStop returned the local fallback findings bundle."
      : aiStatus?.latestError?.trim()
        ? aiStatus.latestError
        : "The pipeline did not complete cleanly. Review the latest AI error and retry the meeting job.";

  const structured = useMemo(
    () =>
      deriveStructuredMeetingContent({
        meeting,
        findings,
        artifacts,
      }),
    [artifacts, findings, meeting]
  );

  useEffect(() => {
    if (!aiStatus?.pending) {
      return;
    }

    const interval = window.setInterval(() => router.refresh(), 8000);
    return () => window.clearInterval(interval);
  }, [aiStatus?.pending, router]);

  async function handleCopy() {
    setError(null);
    await navigator.clipboard.writeText(structured.markdown);
  }

  async function handlePdf() {
    setBusyAction("pdf");
    setError(null);
    try {
      const response = await fetch(
        resolvePublicApiUrl(`/api/workspace/meetings/${meeting.id}/exports/pdf`),
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Unable to generate the PDF.");
      }

      await downloadBlob(
        `${meeting.title.replace(/\s+/g, "-").toLowerCase()}-nextstop.pdf`,
        response
      );
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to generate the PDF.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleTranscriptDownload() {
    setBusyAction("transcript");
    setError(null);
    try {
      const response = await fetch(
        resolvePublicApiUrl(`/api/workspace/meetings/${meeting.id}/transcript`)
      );

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Transcript is no longer available.");
      }

      await downloadBlob(
        `${meeting.title.replace(/\s+/g, "-").toLowerCase()}-transcript.txt`,
        response
      );
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Transcript is no longer available."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleNotionExport() {
    setBusyAction("notion");
    setError(null);
    try {
      const response = await fetch(
        resolvePublicApiUrl(`/api/workspace/meetings/${meeting.id}/exports/notion`),
        {
          method: "POST",
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to export the findings to Notion.");
      }

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to export the findings to Notion."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCancel() {
    setBusyAction("cancel");
    setError(null);
    try {
      const response = await fetch(
        resolvePublicApiUrl(`/api/workspace/meetings/${meeting.id}/cancel`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to cancel the meeting processing.");
      }

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to cancel the meeting processing."
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
      >
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Review</p>
              <h1 className="mt-1 text-3xl font-bold text-white">{meeting.title}</h1>
              <p className="mt-2 text-sm text-zinc-400">
              {MEETING_SOURCE_LABELS[meeting.source_type]} |{" "}
              <WorkspaceDateText value={meeting.created_at} /> |{" "}
              {transcriptAvailability.downloadEnabled
                  ? "temporary transcript available"
                  : "shared outputs, transcript-free cloud workspace"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span
                  className={`rounded-full border px-3 py-1 ${
                    statePresentation.tone === "trust"
                      ? "border-blue-400/20 bg-blue-500/10 text-blue-100"
                      : statePresentation.tone === "warm"
                        ? "border-amber-300/20 bg-amber-400/10 text-amber-50"
                        : statePresentation.tone === "danger"
                          ? "border-red-400/20 bg-red-500/10 text-red-100"
                          : "border-white/10 bg-white/5 text-zinc-200"
                  }`}
                >
                  {statePresentation.label}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-200">
                  {extractionModeLabel}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-zinc-300">
                  {transcriptLifecycleLabel}
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-zinc-300">{structured.summaryShort}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{statePresentation.detail}</p>
            </div>

          <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              radius="full"
              onPress={handleCopy}
              className="brand-button-secondary h-11 font-semibold"
              startContent={<Clipboard className="h-4 w-4" />}
            >
              Copy findings
            </Button>
            <Button
              radius="full"
              onPress={handlePdf}
              isDisabled={meeting.status === "cancel_requested"}
              isLoading={busyAction === "pdf"}
              className="brand-button-primary h-11 font-semibold"
              startContent={busyAction === "pdf" ? undefined : <FileDown className="h-4 w-4" />}
            >
              Export PDF
            </Button>
            <Link
              href={`mailto:?subject=${encodeURIComponent(
                `${meeting.title} recap`
              )}&body=${encodeURIComponent(structured.emailDraft)}`}
            >
              <Button
                radius="full"
                className="brand-button-secondary h-11 w-full font-semibold"
                startContent={<Mail className="h-4 w-4" />}
              >
                Email draft
              </Button>
            </Link>
            <Button
              radius="full"
              onPress={handleTranscriptDownload}
              isDisabled={!transcriptAvailability.downloadEnabled}
              isLoading={busyAction === "transcript"}
              className="brand-button-secondary h-11 font-semibold"
              startContent={
                busyAction === "transcript" ? undefined : <Download className="h-4 w-4" />
              }
            >
              {transcriptAvailability.status === "local_only"
                ? "Transcript on desktop"
                : transcriptAvailability.status === "not_ready"
                  ? "Transcript processing"
                : transcriptAvailability.downloadEnabled
                  ? "Temporary transcript"
                  : "Transcript unavailable"}
            </Button>
            {cancelable ? (
              <Button
                radius="full"
                onPress={handleCancel}
                isLoading={busyAction === "cancel"}
                className="brand-button-secondary h-11 font-semibold"
                startContent={busyAction === "cancel" ? undefined : <Square className="h-4 w-4" />}
              >
                Cancel processing
              </Button>
            ) : null}
          </div>
        </div>
      </motion.section>

      {error ? (
        <section className="rounded-[2rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
          {error}
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Summary</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Structured findings</h2>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Full summary</p>
              <p className="mt-3 text-sm leading-7 text-zinc-300">{structured.summaryFull}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                  Executive bullets
                </p>
                <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                  {renderList(structured.executiveBullets, "No executive bullets captured")}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Decisions</p>
                <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                  {renderList(structured.decisions, "No decisions captured")}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Action items</p>
                <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                  {renderList(structured.actionItems, "No action items captured")}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                  Risks and follow-ups
                </p>
                <div className="mt-3 space-y-3 text-sm text-zinc-300">
                  <div>
                    <p className="font-medium text-white">Risks</p>
                    <ul className="mt-2 space-y-2">
                      {renderList(structured.risks, "No risks captured")}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-white">Follow-ups</p>
                    <ul className="mt-2 space-y-2">
                      {renderList(structured.followUps, "No follow-ups captured")}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Processing status</p>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm leading-7 text-zinc-300">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Review state</p>
                <p className="mt-2 font-medium text-white">{statePresentation.label}</p>
                <p className="mt-1 text-zinc-400">{statePresentation.detail}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Actionability</p>
                <p className="mt-2 font-medium text-white">{actionabilityLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Extraction mode</p>
                <p className="mt-2 font-medium text-white">{extractionModeLabel}</p>
                {generationStatus ? (
                  <p className="mt-1 text-zinc-400">
                    Status: <span className="text-zinc-200">{generationStatus.replace(/_/g, " ")}</span>
                  </p>
                ) : null}
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Transcript lifecycle
                </p>
                <p className="mt-2 font-medium text-white">{transcriptLifecycleLabel}</p>
                {transcriptAvailability.status === "not_ready" ? (
                  <p className="mt-1 text-zinc-400">
                    Temporary transcript will appear here as soon as transcription completes.
                  </p>
                ) : null}
              </div>
              <p>
                Phase: <span className="text-white">{aiStatus?.phase?.replace(/_/g, " ") ?? meeting.status}</span>
              </p>
              {aiStatus?.transcriptReadyAt ? (
                <p className="text-zinc-400">
                  Transcript ready <WorkspaceDateText value={aiStatus.transcriptReadyAt} />
                </p>
              ) : null}
              {aiStatus?.findingsReadyAt ? (
                <p className="text-zinc-400">
                  Findings ready <WorkspaceDateText value={aiStatus.findingsReadyAt} />
                </p>
              ) : null}
              {typeof aiStatus?.retryCount === "number" && aiStatus.retryCount > 0 ? (
                <p className="flex items-center gap-2 text-zinc-400">
                  <RotateCcw className="h-4 w-4 text-[var(--brand-highlight)]" />
                  Retry count: {aiStatus.retryCount}
                </p>
              ) : null}
              {aiStatus?.latestError ? (
                <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-100">
                  Latest AI error: {aiStatus.latestError}
                </p>
              ) : null}
              {findingsPending ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Processing</p>
                  <p className="mt-2 font-medium text-white">
                    {meeting.status === "cancel_requested"
                      ? "Stopping at the next safe checkpoint."
                      : meeting.status === "transcript_ready"
                        ? "Temporary transcript is ready while findings continue."
                        : "The backend pipeline is still running for this meeting."}
                  </p>
                  {cancelable ? (
                    <div className="mt-3">
                      <Button
                        radius="full"
                        onPress={handleCancel}
                        isLoading={busyAction === "cancel"}
                        className="brand-button-secondary h-10 font-semibold"
                        startContent={
                          busyAction === "cancel" ? undefined : <Square className="h-4 w-4" />
                        }
                      >
                        Cancel processing
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {shouldExplainState ? (
            <div className="rounded-[2rem] border border-amber-300/20 bg-amber-400/10 p-6">
              <p className="text-sm uppercase tracking-[0.22em] text-amber-100/80">
                Why this state?
              </p>
              <div className="mt-4 space-y-2 text-sm leading-7 text-amber-50">
                <p>{stateExplanation}</p>
                {fallbackReason && surfaceState === "degraded" ? (
                  <p className="text-amber-100/80">Primary model path unavailable: {fallbackReason}</p>
                ) : null}
                <p className="text-amber-100/80">
                  Review findings before sharing externally if the meeting completed in degraded mode.
                </p>
              </div>
            </div>
          ) : null}

          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Privacy</p>
            <div className="mt-4 flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-[var(--brand-highlight)]" />
              <p className="text-sm leading-7 text-zinc-300">
                Raw audio is short-lived for {providerStatus.rawAssetRetentionHours} hours, and
                the durable cloud record keeps only structured findings, exports, and meeting
                metadata.
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Transcript access</p>
            <div className="mt-4 space-y-2 text-sm leading-7 text-zinc-300">
              <p>{transcriptAvailability.message}</p>
              {transcriptAvailability.expiresAt ? (
                <p className="text-zinc-400">
                  Available until <WorkspaceDateText value={transcriptAvailability.expiresAt} />
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Notion export</p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {notionReady ? "Destination ready" : "Needs Notion connection"}
                </h2>
              </div>
              <Link href="/dashboard/notion" className="brand-link text-sm text-zinc-400">
                Configure
              </Link>
            </div>

            <p className="mt-4 text-sm leading-7 text-zinc-300">
              {notionReady
                ? "Export the canonical meeting artifact to the configured Notion destination."
                : "Connect Notion and choose a destination before exporting findings there."}
            </p>

            <div className="mt-5">
              <Button
                radius="full"
                onPress={handleNotionExport}
                isDisabled={!notionReady || meeting.status === "cancel_requested"}
                isLoading={busyAction === "notion"}
                className="brand-button-secondary h-11 font-semibold"
                startContent={
                  busyAction === "notion" ? undefined : <ExternalLink className="h-4 w-4" />
                }
              >
                Export to Notion
              </Button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Export history</p>
            <div className="mt-4 space-y-3">
              {exports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-zinc-500">
                  No exports logged yet for this meeting.
                </div>
              ) : (
                exports.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium capitalize text-white">
                        {item.export_type.replace(/_/g, " ")}
                      </span>
                      <WorkspaceDateText value={item.created_at} className="text-zinc-500" />
                    </div>
                    <p className="mt-1 text-zinc-400">{item.status}</p>
                    {item.destination ? (
                      <p className="mt-1 text-zinc-500">{item.destination}</p>
                    ) : null}
                    {typeof item.duration_ms === "number" ? (
                      <p className="mt-1 text-zinc-500">Duration: {item.duration_ms} ms</p>
                    ) : null}
                    {item.latest_error ? (
                      <p className="mt-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-red-100">
                        {item.latest_error}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

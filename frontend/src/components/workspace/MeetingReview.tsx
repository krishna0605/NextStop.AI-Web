"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import {
  Clipboard,
  Download,
  ExternalLink,
  FileDown,
  Mail,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { deriveStructuredMeetingContent } from "@/lib/meeting-artifacts";
import { resolvePublicApiUrl } from "@/lib/public-backend";
import type {
  AiStatusSnapshot,
  IntegrationRecord,
  MeetingArtifactRecord,
  MeetingExportRecord,
  MeetingFindingsRecord,
  TranscriptAvailability,
  WebMeetingRecord,
} from "@/lib/workspace";
import { formatWorkspaceDate, MEETING_SOURCE_LABELS } from "@/lib/workspace";

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

function artifactLabel(artifactType: MeetingArtifactRecord["artifact_type"]) {
  switch (artifactType) {
    case "canonical_json":
      return "Canonical JSON";
    case "canonical_markdown":
      return "Canonical Markdown";
    case "summary":
      return "Summary";
    case "action_items":
      return "Actions";
    case "email_draft":
      return "Email Draft";
    default:
      return artifactType;
  }
}

function getMetadataRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getMetadataString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
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
    "pdf" | "transcript" | "notion" | "summary" | "action_items" | "email_draft" | null
  >(null);
  const notionReady = notion?.status === "connected";

  const structured = useMemo(
    () =>
      deriveStructuredMeetingContent({
        meeting,
        findings,
        artifacts,
      }),
    [artifacts, findings, meeting]
  );
  const artifactRows = useMemo(
    () =>
      artifacts.filter((artifact) =>
        ["summary", "action_items", "email_draft", "canonical_json", "canonical_markdown"].includes(
          artifact.artifact_type
        )
      ),
    [artifacts]
  );
  const modelBadges = useMemo(
    () =>
      Array.from(
        new Set(
          artifactRows
            .map((artifact) => artifact.source_model)
            .concat(findings?.source_model ?? null)
            .filter(Boolean)
        )
      ) as string[],
    [artifactRows, findings?.source_model]
  );
  const latestJobMetadata = useMemo(
    () => getMetadataRecord(aiStatus?.latestJob?.provider_metadata),
    [aiStatus?.latestJob?.provider_metadata]
  );
  const transcriptionMetadata = useMemo(
    () => getMetadataRecord(latestJobMetadata.transcription),
    [latestJobMetadata]
  );
  const findingsMetadata = useMemo(
    () => getMetadataRecord(latestJobMetadata.findings),
    [latestJobMetadata]
  );
  const remoteDispatchMetadata = useMemo(
    () => getMetadataRecord(latestJobMetadata.remote_dispatch),
    [latestJobMetadata]
  );
  const latestExecutionMode = getMetadataString(latestJobMetadata, "execution_mode");
  const latestFailedStage = getMetadataString(latestJobMetadata, "failed_stage");
  const remoteDispatchQueuedAt = getMetadataString(remoteDispatchMetadata, "queuedAt");
  const remoteDispatchError = getMetadataString(remoteDispatchMetadata, "error");
  const latestJobError =
    aiStatus?.latestJob?.error?.trim() || remoteDispatchError || null;
  const runtimeStatus =
    providerStatus.aiPipelineMode === "railway_remote"
      ? latestExecutionMode === "railway_remote"
        ? aiStatus?.latestJob?.status === "failed"
          ? "Remote worker failed"
          : "Remote worker executed"
        : providerStatus.aiCoreConfigured
          ? "Remote queue configured"
          : "Remote queue misconfigured"
      : "Inline fallback active";

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

      await downloadBlob(`${meeting.title.replace(/\s+/g, "-").toLowerCase()}-nextstop.pdf`, response);
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

      await downloadBlob(`${meeting.title.replace(/\s+/g, "-").toLowerCase()}-transcript.txt`, response);
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

  async function handleRegenerate(artifactType: "summary" | "action_items" | "email_draft") {
    setBusyAction(artifactType);
    setError(null);
    try {
      const response = await fetch(
        resolvePublicApiUrl(
          `/api/workspace/meetings/${meeting.id}/artifacts/${artifactType}/regenerate`
        ),
        { method: "POST" }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to regenerate this artifact.");
      }

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to regenerate this artifact."
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
              {MEETING_SOURCE_LABELS[meeting.source_type]} | {formatWorkspaceDate(meeting.created_at)} | shared outputs, transcript-free cloud workspace
            </p>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              {structured.summaryShort}
            </p>
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
              isLoading={busyAction === "pdf"}
              className="brand-button-primary h-11 font-semibold"
              startContent={busyAction === "pdf" ? undefined : <FileDown className="h-4 w-4" />}
            >
              Export PDF
            </Button>
            <Link
              href={`mailto:?subject=${encodeURIComponent(`${meeting.title} recap`)}&body=${encodeURIComponent(structured.emailDraft)}`}
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
              startContent={busyAction === "transcript" ? undefined : <Download className="h-4 w-4" />}
            >
              {transcriptAvailability.status === "local_only"
                ? "Transcript on desktop"
                : transcriptAvailability.downloadEnabled
                  ? "Temporary transcript"
                  : "Transcript unavailable"}
            </Button>
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Summary</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Structured findings</h2>
            </div>
            <Button
              radius="full"
              onPress={() => handleRegenerate("summary")}
              isLoading={busyAction === "summary"}
              className="brand-button-secondary h-10 font-semibold"
              startContent={busyAction === "summary" ? undefined : <RefreshCcw className="h-4 w-4" />}
            >
              Regenerate summary
            </Button>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Full summary</p>
              <p className="mt-3 text-sm leading-7 text-zinc-300">{structured.summaryFull}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Executive bullets</p>
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
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Action items</p>
                  <Button
                    radius="full"
                    onPress={() => handleRegenerate("action_items")}
                    isLoading={busyAction === "action_items"}
                    className="brand-button-secondary h-8 px-3 text-xs font-semibold"
                  >
                    Regenerate
                  </Button>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                  {renderList(structured.actionItems, "No action items captured")}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Risks and follow-ups</p>
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Transcription pipeline</p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {aiStatus?.latestJob ? aiStatus.latestJob.stage.replace(/_/g, " ") : "Awaiting run"}
                </h2>
              </div>
              <Sparkles className="h-5 w-5 text-[var(--brand-highlight)]" />
            </div>
            <div className="mt-4 space-y-3 text-sm text-zinc-300">
              <p>
                Status: {aiStatus?.latestJob?.status ?? meeting.status} | Pipeline:{" "}
                {providerStatus.aiPipelineMode}
              </p>
              <p>
                Runtime: {runtimeStatus} | Execution: {latestExecutionMode ?? "awaiting"} |
                Deepgram: {providerStatus.deepgramConfigured ? "configured" : "not configured"}
              </p>
              <p>
                Transcription: {getMetadataString(transcriptionMetadata, "status") ?? "awaiting"} | Provider:{" "}
                {getMetadataString(transcriptionMetadata, "sourceModel") ??
                  (providerStatus.deepgramConfigured ? "deepgram" : "not configured")}
              </p>
              <p>
                Findings: {getMetadataString(findingsMetadata, "status") ?? "awaiting"} | Provider:{" "}
                {getMetadataString(findingsMetadata, "sourceModel") ??
                  (providerStatus.openAiConfigured ? "openai downstream" : "not configured")}
              </p>
              {remoteDispatchQueuedAt ? (
                <p>Remote dispatch queued at: {formatWorkspaceDate(remoteDispatchQueuedAt)}</p>
              ) : null}
              {latestFailedStage ? (
                <p>Latest failure stage: {latestFailedStage.replace(/_/g, " ")}</p>
              ) : null}
              {aiStatus?.pending ? (
                <p className="text-zinc-400">
                  This view refreshes automatically while transcription and findings are still running.
                </p>
              ) : null}
              {latestJobError ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  Latest job error: {latestJobError}
                </div>
              ) : null}
              {modelBadges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {modelBadges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-200"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Artifacts</p>
            <div className="mt-4 space-y-3">
              {artifactRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-zinc-500">
                  No artifacts have been materialized yet.
                </div>
              ) : (
                artifactRows.map((artifact) => (
                  <div
                    key={artifact.artifact_type}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-white">{artifactLabel(artifact.artifact_type)}</span>
                      <span className="text-zinc-500">
                        {artifact.status} | v{artifact.version ?? 1}
                      </span>
                    </div>
                    <p className="mt-1 text-zinc-400">
                      {artifact.source_model ?? "artifact-ready"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Privacy</p>
            <div className="mt-4 flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-[var(--brand-highlight)]" />
              <p className="text-sm leading-7 text-zinc-300">
                Raw audio is short-lived for {providerStatus.rawAssetRetentionHours} hours, and the durable cloud record keeps only structured findings, exports, and meeting metadata.
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Transcript access</p>
            <div className="mt-4 space-y-2 text-sm leading-7 text-zinc-300">
              <p>{transcriptAvailability.message}</p>
              {transcriptAvailability.expiresAt ? (
                <p className="text-zinc-400">
                  Available until {formatWorkspaceDate(transcriptAvailability.expiresAt)}
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

            <div className="mt-5 grid grid-cols-1 gap-3">
              <Button
                radius="full"
                onPress={handleNotionExport}
                isDisabled={!notionReady}
                isLoading={busyAction === "notion"}
                className="brand-button-secondary h-11 font-semibold"
                startContent={busyAction === "notion" ? undefined : <ExternalLink className="h-4 w-4" />}
              >
                Export to Notion
              </Button>
              <Button
                radius="full"
                onPress={() => handleRegenerate("email_draft")}
                isLoading={busyAction === "email_draft"}
                className="brand-button-secondary h-11 font-semibold"
                startContent={busyAction === "email_draft" ? undefined : <RefreshCcw className="h-4 w-4" />}
              >
                Regenerate email draft
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
                      <span className="text-zinc-500">{formatWorkspaceDate(item.created_at)}</span>
                    </div>
                    <p className="mt-1 text-zinc-400">{item.status}</p>
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

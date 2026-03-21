"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import {
  Clipboard,
  Download,
  ExternalLink,
  FileDown,
  Mail,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  IntegrationRecord,
  MeetingExportRecord,
  MeetingFindingsRecord,
  WebMeetingRecord,
} from "@/lib/workspace";
import { compactList, formatWorkspaceDate, MEETING_SOURCE_LABELS } from "@/lib/workspace";

function findingsToMarkdown(meeting: WebMeetingRecord, findings: MeetingFindingsRecord | null) {
  return [
    `# ${meeting.title}`,
    "",
    `Source: ${MEETING_SOURCE_LABELS[meeting.source_type]}`,
    `Created: ${formatWorkspaceDate(meeting.created_at)}`,
    "",
    "## Summary",
    findings?.summary_full || findings?.summary_short || "No summary generated yet.",
    "",
    "## Executive Bullets",
    ...compactList(findings?.executive_bullets_json, "No executive bullets yet").map((item) => `- ${item}`),
    "",
    "## Decisions",
    ...compactList(findings?.decisions_json, "No decisions captured").map((item) => `- ${item}`),
    "",
    "## Action Items",
    ...compactList(findings?.action_items_json, "No action items captured").map((item) => `- ${item}`),
    "",
    "## Risks",
    ...compactList(findings?.risks_json, "No risks captured").map((item) => `- ${item}`),
    "",
    "## Follow Ups",
    ...compactList(findings?.follow_ups_json, "No follow ups captured").map((item) => `- ${item}`),
  ].join("\n");
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

export function MeetingReview({
  meeting,
  findings,
  exports,
  notion,
}: {
  meeting: WebMeetingRecord;
  findings: MeetingFindingsRecord | null;
  exports: MeetingExportRecord[];
  notion: IntegrationRecord | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"pdf" | "transcript" | "notion" | null>(null);

  const markdown = useMemo(() => findingsToMarkdown(meeting, findings), [meeting, findings]);
  const notionReady = notion?.status === "connected";

  async function handleCopy() {
    setError(null);
    await navigator.clipboard.writeText(markdown);
  }

  async function handlePdf() {
    setBusyAction("pdf");
    setError(null);
    try {
      const response = await fetch(`/api/workspace/meetings/${meeting.id}/exports/pdf`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Unable to generate the PDF.");
      }

      await downloadBlob(`${meeting.title.replace(/\s+/g, "-").toLowerCase()}-nextstop.pdf`, response);
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
      const response = await fetch(`/api/workspace/meetings/${meeting.id}/transcript`);

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Transcript is no longer available.");
      }

      await downloadBlob(`${meeting.title.replace(/\s+/g, "-").toLowerCase()}-transcript.txt`, response);
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
      const response = await fetch(`/api/workspace/meetings/${meeting.id}/exports/notion`, {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to queue the Notion export.");
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to queue the Notion export."
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
              {MEETING_SOURCE_LABELS[meeting.source_type]} • {formatWorkspaceDate(meeting.created_at)} •
              only findings are stored
            </p>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              {findings?.summary_short ??
                "Finalize a session to generate the privacy-safe findings bundle for this meeting."}
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
              href={`mailto:?subject=${encodeURIComponent(`${meeting.title} recap`)}&body=${encodeURIComponent(findings?.email_draft || markdown)}`}
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
              isLoading={busyAction === "transcript"}
              className="brand-button-secondary h-11 font-semibold"
              startContent={busyAction === "transcript" ? undefined : <Download className="h-4 w-4" />}
            >
              One-time transcript
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
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Summary</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Structured findings</h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Full summary</p>
              <p className="mt-3 text-sm leading-7 text-zinc-300">
                {findings?.summary_full || "No findings have been generated yet."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Executive bullets</p>
                <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                  {compactList(findings?.executive_bullets_json, "No executive bullets captured").map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Decisions</p>
                <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                  {compactList(findings?.decisions_json, "No decisions captured").map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Action items</p>
                <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                  {compactList(findings?.action_items_json, "No action items captured").map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Risks and follow-ups</p>
                <div className="mt-3 space-y-3 text-sm text-zinc-300">
                  <div>
                    <p className="font-medium text-white">Risks</p>
                    <ul className="mt-2 space-y-2">
                      {compactList(findings?.risks_json, "No risks captured").map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-white">Follow-ups</p>
                    <ul className="mt-2 space-y-2">
                      {compactList(findings?.follow_ups_json, "No follow-ups captured").map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Privacy</p>
            <div className="mt-4 flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-[var(--brand-highlight)]" />
              <p className="text-sm leading-7 text-zinc-300">
                This meeting keeps only the findings bundle. The transcript was never stored in
                Supabase and can only be downloaded once if it still exists in the active session buffer.
              </p>
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
                ? "Queue this findings bundle for the configured Notion destination."
                : "Connect Notion and choose a destination before exporting summaries there."}
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

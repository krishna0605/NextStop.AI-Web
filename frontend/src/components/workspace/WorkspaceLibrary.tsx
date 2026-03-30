"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ExternalLink,
  FileSearch,
  NotebookPen,
  PlayCircle,
  Radio,
  RefreshCcw,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useWorkspaceCaptureController } from "@/components/workspace/WorkspaceCaptureIsland";
import type { WorkspaceOverview } from "@/lib/workspace";
import { formatWorkspaceDate, MEETING_SOURCE_LABELS, MEETING_STATUS_COPY } from "@/lib/workspace";

function toneClass(tone: "warm" | "trust" | "neutral" | "danger") {
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

function readMetadataValue(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function originLabel(originPlatform: string | null | undefined) {
  return originPlatform === "desktop" ? "Desktop" : "Web";
}

export function WorkspaceLibrary({ overview }: { overview: WorkspaceOverview }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { openCaptureControls, setCaptureTarget } = useWorkspaceCaptureController();

  useEffect(() => {
    const hasPendingMeetings = overview.meetings.some((meeting) =>
      ["queued", "transcribing", "analyzing", "processing"].includes(meeting.status)
    );

    if (!hasPendingMeetings) {
      return;
    }

    const interval = window.setInterval(() => router.refresh(), 10000);
    return () => window.clearInterval(interval);
  }, [overview.meetings, router]);

  const meetings = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return overview.meetings.filter((meeting) => {
      const summary = overview.findingsByMeetingId[meeting.id]?.summary_short ?? "";
      const aiStatus = overview.aiStatusByMeetingId[meeting.id]?.latestJob?.stage ?? "";
      const haystack = `${meeting.title} ${summary} ${meeting.source_type} ${meeting.origin_platform ?? "web"} ${meeting.status} ${aiStatus}`.toLowerCase();
      return !normalized || haystack.includes(normalized);
    });
  }, [overview, search]);

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
      >
        <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Unified library</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Scheduled and captured meetings</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              This view combines Google meetings created in the workspace with direct browser-tab
              captures. Transcription stages, downstream findings, artifact durability, and export
              history stay here.
            </p>
          </div>
          <div className="flex w-full max-w-sm flex-col gap-3">
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-400">Search meetings</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, source, summary, or transcription stage"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-[rgb(var(--brand-primary-rgb)/0.5)]"
              />
            </label>
            <Button
              radius="full"
              onPress={() => router.refresh()}
              className="brand-button-secondary h-10 font-semibold"
              startContent={<RefreshCcw className="h-4 w-4" />}
            >
              Refresh library
            </Button>
          </div>
        </div>
      </motion.section>

      <section className="grid grid-cols-1 gap-4">
        {meetings.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-white/10 bg-zinc-950/50 px-6 py-14 text-center">
            <FileSearch className="mx-auto h-10 w-10 text-zinc-600" />
            <p className="mt-4 text-lg font-medium text-white">No matching meetings yet</p>
            <p className="mt-2 text-sm text-zinc-500">
              Create a Google Meet or start a browser capture from the sidebar controls to
              populate this library.
            </p>
          </div>
        ) : (
          meetings.map((meeting, index) => {
            const findings = overview.findingsByMeetingId[meeting.id];
            const exports = overview.exportsByMeetingId[meeting.id] ?? [];
            const status = MEETING_STATUS_COPY[meeting.status];
            const aiStatus = overview.aiStatusByMeetingId[meeting.id];
            const meetUrl = readMetadataValue(meeting.session_metadata, "meet_url");
            const eventUrl = readMetadataValue(meeting.session_metadata, "event_url");
            const scheduledStart = readMetadataValue(meeting.session_metadata, "scheduled_start");
            const sourceLabel = MEETING_SOURCE_LABELS[meeting.source_type];
            const platformLabel = originLabel(meeting.origin_platform);
            const primaryDate =
              meeting.status === "scheduled" || meeting.status === "draft"
                ? formatWorkspaceDate(scheduledStart)
                : formatWorkspaceDate(meeting.ended_at || meeting.created_at);
            const isScheduled = meeting.status === "scheduled" || meeting.status === "draft";
            const isCapturing = ["capturing", "queued", "transcribing", "analyzing", "processing"].includes(
              meeting.status
            );
            const isReady = meeting.status === "ready" || meeting.status === "partial_success";
            const detailHref = `/dashboard/review/${meeting.id}`;
            const previewCopy = isReady
              ? findings?.summary_full ?? status.description
              : aiStatus?.latestJob?.stage
                ? `Pipeline stage: ${aiStatus.latestJob.stage.replace(/_/g, " ")}`
                : status.description;

            return (
              <motion.article
                key={meeting.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-xl font-semibold text-white">{meeting.title}</h2>
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${toneClass(status.tone)}`}>
                        {status.label}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-200">
                        {platformLabel}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs text-zinc-300">
                        {sourceLabel}
                      </span>
                      {aiStatus?.latestJob?.stage ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                          {aiStatus.latestJob.stage.replace(/_/g, " ")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">{primaryDate}</p>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">{previewCopy}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 text-sm text-zinc-400">
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="font-medium text-white">{exports.length}</p>
                      <p className="mt-1 text-xs text-zinc-500">Exports logged</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="font-medium text-white">{aiStatus?.artifacts.length ?? 0}</p>
                      <p className="mt-1 text-xs text-zinc-500">Artifacts</p>
                    </div>
                    {isReady || meeting.status === "failed" ? (
                      <Link href={detailHref}>
                        <Button
                          radius="full"
                          className="brand-button-secondary h-10 px-5 font-semibold"
                          endContent={<ArrowRight className="h-4 w-4" />}
                        >
                          Open review
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Executive bullets</p>
                    <p className="mt-3 text-sm text-zinc-300">
                      {findings?.executive_bullets_json?.[0] ?? (isScheduled ? "Waiting for capture" : "Not generated yet")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Decisions</p>
                    <p className="mt-3 text-sm text-zinc-300">
                      {findings?.decisions_json?.[0] ?? (isScheduled ? "No decisions until findings run" : "No decisions captured")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Action items</p>
                    <p className="mt-3 text-sm text-zinc-300">
                      {findings?.action_items_json?.[0] ?? (isScheduled ? "Start capture from this meeting" : "No action items captured")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Transcript / durability</p>
                    <p className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
                      <NotebookPen className="h-4 w-4 text-[var(--brand-highlight)]" />
                      {meeting.origin_platform === "desktop" && meeting.transcript_storage === "local_only"
                        ? "Transcript available only on desktop"
                        : aiStatus?.transcriptAsset?.expires_at
                        ? `Transcript TTL until ${formatWorkspaceDate(aiStatus.transcriptAsset.expires_at)}`
                        : "Structured outputs only"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {isScheduled ? (
                    <>
                      {meetUrl ? (
                        <a href={meetUrl} target="_blank" rel="noreferrer">
                          <Button
                            radius="full"
                            className="brand-button-primary h-10 px-5 font-semibold"
                            startContent={<Video className="h-4 w-4" />}
                          >
                            Join Meet
                          </Button>
                        </a>
                      ) : null}

                      {eventUrl ? (
                        <a href={eventUrl} target="_blank" rel="noreferrer">
                          <Button
                            radius="full"
                            className="brand-button-secondary h-10 px-5 font-semibold"
                            startContent={<ExternalLink className="h-4 w-4" />}
                          >
                            Open Event
                          </Button>
                        </a>
                      ) : null}

                      <Button
                        radius="full"
                        onPress={() =>
                          setCaptureTarget({
                            meetingId: meeting.id,
                            title: meeting.title,
                            sourceType: meeting.source_type === "google_meet" ? "google_meet" : "browser_tab",
                            googleEventId: meeting.google_event_id ?? null,
                            meetUrl,
                          })
                        }
                        className="brand-button-secondary h-10 px-5 font-semibold"
                        startContent={<PlayCircle className="h-4 w-4" />}
                      >
                        Start Capture
                      </Button>
                    </>
                  ) : null}

                  {isCapturing ? (
                    <Button
                      radius="full"
                      onPress={openCaptureControls}
                      className="brand-button-secondary h-10 px-5 font-semibold"
                      startContent={<Radio className="h-4 w-4" />}
                    >
                      Open Controls
                    </Button>
                  ) : null}
                </div>
              </motion.article>
            );
          })
        )}
      </section>
    </div>
  );
}

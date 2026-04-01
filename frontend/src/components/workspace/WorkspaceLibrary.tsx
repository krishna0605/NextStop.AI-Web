"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ExternalLink,
  FileSearch,
  LoaderCircle,
  NotebookPen,
  PlayCircle,
  Radio,
  RefreshCcw,
  Video,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

import { useWorkspaceCaptureController } from "@/components/workspace/WorkspaceCaptureIsland";
import type { LibraryMeetingCard, LibraryPageData } from "@/lib/workspace";
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

function originLabel(originPlatform: string | null | undefined) {
  return originPlatform === "desktop" ? "Desktop" : "Web";
}

function buildLibrarySearchParams(args: {
  searchParams: URLSearchParams;
  query?: string;
  cursor?: string | null;
}) {
  const next = new URLSearchParams(args.searchParams.toString());

  if (args.query !== undefined) {
    const trimmedQuery = args.query.trim();
    if (trimmedQuery) {
      next.set("q", trimmedQuery);
    } else {
      next.delete("q");
    }
  }

  if (args.cursor) {
    next.set("cursor", args.cursor);
  } else {
    next.delete("cursor");
  }

  return next;
}

function formatPreviewCopy(meeting: LibraryMeetingCard) {
  if (meeting.summaryShort?.trim()) {
    return meeting.summaryShort;
  }

  if (meeting.latestError?.trim()) {
    return meeting.latestError;
  }

  if (meeting.latestAiStage) {
    return `Pipeline stage: ${meeting.latestAiStage.replace(/_/g, " ")}`;
  }

  return MEETING_STATUS_COPY[meeting.status].description;
}

export function WorkspaceLibrary({ data }: { data: LibraryPageData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isNavigating, startTransition] = useTransition();
  const { openCaptureControls, setCaptureTarget } = useWorkspaceCaptureController();

  useEffect(() => {
    const hasPendingMeetings = data.cards.some((meeting) =>
      ["queued", "transcribing", "transcript_ready", "analyzing", "processing"].includes(
        meeting.status
      )
    );

    if (!hasPendingMeetings) {
      return;
    }

    const interval = window.setInterval(() => router.refresh(), 10000);
    return () => window.clearInterval(interval);
  }, [data.cards, router]);

  function navigate(nextSearchParams: URLSearchParams) {
    startTransition(() => {
      const queryString = nextSearchParams.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    });
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = searchInputRef.current?.value ?? data.query;
    navigate(
      buildLibrarySearchParams({
        searchParams,
        query: nextQuery,
        cursor: null,
      })
    );
  }

  function handleNextPage() {
    if (!data.nextCursor) {
      return;
    }

    navigate(
      buildLibrarySearchParams({
        searchParams,
        cursor: data.nextCursor,
      })
    );
  }

  function handleResetFilters() {
    navigate(new URLSearchParams());
  }

  function handleFirstPage() {
    navigate(
      buildLibrarySearchParams({
        searchParams,
        cursor: null,
      })
    );
  }

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
              captures. Search and paging now run server-side so the page can paint faster while
              sessions continue updating in the background.
            </p>
          </div>

          <form className="flex w-full max-w-sm flex-col gap-3" onSubmit={handleSearchSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-400">Search meetings</span>
              <input
                key={data.query}
                ref={searchInputRef}
                defaultValue={data.query}
                placeholder="Search by title"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-[rgb(var(--brand-primary-rgb)/0.5)]"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                radius="full"
                className="brand-button-secondary h-10 flex-1 font-semibold"
                startContent={
                  isNavigating ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSearch className="h-4 w-4" />
                  )
                }
              >
                Search library
              </Button>
              <Button
                radius="full"
                onPress={() => router.refresh()}
                className="brand-button-secondary h-10 font-semibold"
                startContent={<RefreshCcw className="h-4 w-4" />}
              >
                Refresh
              </Button>
            </div>
          </form>
        </div>
      </motion.section>

      <section className="grid grid-cols-1 gap-4">
        {data.cards.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-white/10 bg-zinc-950/50 px-6 py-14 text-center">
            <FileSearch className="mx-auto h-10 w-10 text-zinc-600" />
            <p className="mt-4 text-lg font-medium text-white">No matching meetings yet</p>
            <p className="mt-2 text-sm text-zinc-500">
              {data.query
                ? "Try a broader search or clear the filter to see more meetings."
                : "Create a Google Meet or start a browser capture from the sidebar controls to populate this library."}
            </p>
            {data.query ? (
              <div className="mt-5">
                <Button
                  radius="full"
                  onPress={handleResetFilters}
                  className="brand-button-secondary h-10 px-5 font-semibold"
                >
                  Clear search
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          data.cards.map((meeting) => {
            const status = MEETING_STATUS_COPY[meeting.status];
            const sourceLabel = MEETING_SOURCE_LABELS[meeting.sourceType];
            const platformLabel = originLabel(meeting.originPlatform);
            const primaryDate =
              meeting.status === "scheduled" || meeting.status === "draft"
                ? formatWorkspaceDate(meeting.scheduledStart)
                : formatWorkspaceDate(meeting.endedAt || meeting.createdAt);
            const isScheduled = meeting.status === "scheduled" || meeting.status === "draft";
            const isCapturing = [
              "capturing",
              "queued",
              "transcribing",
              "transcript_ready",
              "analyzing",
              "processing",
            ].includes(meeting.status);
            const isReady =
              meeting.status === "ready" ||
              meeting.status === "partial_success" ||
              meeting.status === "transcript_ready";
            const detailHref = `/dashboard/review/${meeting.id}`;

            return (
              <motion.article
                key={meeting.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-xl font-semibold text-white">{meeting.title}</h2>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs ${toneClass(status.tone)}`}
                      >
                        {status.label}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-200">
                        {platformLabel}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs text-zinc-300">
                        {sourceLabel}
                      </span>
                      {meeting.latestAiStage ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                          {meeting.latestAiStage.replace(/_/g, " ")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">{primaryDate}</p>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
                      {formatPreviewCopy(meeting)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 text-sm text-zinc-400">
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="font-medium text-white">{meeting.exportCount}</p>
                      <p className="mt-1 text-xs text-zinc-500">Exports logged</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="font-medium text-white">{meeting.artifactCount}</p>
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
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                      Executive bullets
                    </p>
                    <p className="mt-3 text-sm text-zinc-300">
                      {meeting.summaryShort ?? (isScheduled ? "Waiting for capture" : "Not generated yet")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Decisions</p>
                    <p className="mt-3 text-sm text-zinc-300">
                      {meeting.phase === "ready"
                        ? "Review the meeting for extracted decisions."
                        : isScheduled
                          ? "No decisions until findings run"
                          : "No decisions captured"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                      Action items
                    </p>
                    <p className="mt-3 text-sm text-zinc-300">
                      {meeting.phase === "ready"
                        ? "Open review for the structured action list."
                        : isScheduled
                          ? "Start capture from this meeting"
                          : "No action items captured"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                      Transcript / durability
                    </p>
                    <p className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
                      <NotebookPen className="h-4 w-4 text-[var(--brand-highlight)]" />
                      {meeting.originPlatform === "desktop"
                        ? "Transcript available only on desktop"
                        : meeting.transcriptExpiresAt
                          ? `Transcript TTL until ${formatWorkspaceDate(meeting.transcriptExpiresAt)}`
                          : "Structured outputs only"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {isScheduled ? (
                    <>
                      {meeting.meetUrl ? (
                        <a href={meeting.meetUrl} target="_blank" rel="noreferrer">
                          <Button
                            radius="full"
                            className="brand-button-primary h-10 px-5 font-semibold"
                            startContent={<Video className="h-4 w-4" />}
                          >
                            Join Meet
                          </Button>
                        </a>
                      ) : null}

                      {meeting.eventUrl ? (
                        <a href={meeting.eventUrl} target="_blank" rel="noreferrer">
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
                            sourceType:
                              meeting.sourceType === "google_meet"
                                ? "google_meet"
                                : "browser_tab",
                            googleEventId: meeting.googleEventId ?? null,
                            meetUrl: meeting.meetUrl,
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-white/10 bg-zinc-950/50 px-5 py-4">
        <p className="text-sm text-zinc-400">
          Showing up to {data.limit} meetings{data.query ? ` for "${data.query}"` : ""}.
        </p>
        <div className="flex flex-wrap gap-3">
          {searchParams.get("cursor") ? (
            <Button
              radius="full"
              onPress={handleFirstPage}
              className="brand-button-secondary h-10 px-5 font-semibold"
            >
              First page
            </Button>
          ) : null}
          <Button
            radius="full"
            onPress={handleNextPage}
            isDisabled={!data.nextCursor || isNavigating}
            className="brand-button-secondary h-10 px-5 font-semibold"
            endContent={
              isNavigating ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )
            }
          >
            Next page
          </Button>
        </div>
      </div>
    </div>
  );
}

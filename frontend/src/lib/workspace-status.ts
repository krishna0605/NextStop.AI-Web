import type {
  AiStatusSnapshot,
  FindingsGenerationStatus,
  LibraryMeetingCard,
  MeetingFindingsRecord,
  TranscriptAvailability,
  WebMeetingRecord,
} from "@/lib/workspace";

export type WorkspaceSurfaceState = "processing" | "ready" | "degraded" | "needs_retry";

export function getMeetingSurfaceState(args: {
  meeting: WebMeetingRecord;
  findings?: MeetingFindingsRecord | null;
  aiStatus?: AiStatusSnapshot | null;
}) {
  const generationStatus = args.findings?.generation_status ?? args.aiStatus?.findingsGenerationStatus;
  if (args.meeting.status === "canceled" || args.meeting.status === "cancel_requested") {
    return "processing" as const;
  }

  if (args.meeting.status === "failed" || args.aiStatus?.latestError) {
    return "needs_retry" as const;
  }

  if (args.meeting.status === "partial_success" || generationStatus === "degraded_success") {
    return "degraded" as const;
  }

  if (args.meeting.status === "ready" || args.meeting.status === "transcript_ready") {
    return "ready" as const;
  }

  return "processing" as const;
}

export function getLibrarySurfaceState(card: LibraryMeetingCard) {
  return card.reviewState;
}

export function getSurfaceStatePresentation(
  state: WorkspaceSurfaceState,
  generationStatus?: FindingsGenerationStatus | null
) {
  switch (state) {
    case "ready":
      return {
        label: "Ready",
        tone: "trust" as const,
        detail:
          generationStatus === "full_success"
            ? "Primary extraction path completed successfully."
            : "Findings bundle is ready for review.",
      };
    case "degraded":
      return {
        label: "Degraded",
        tone: "warm" as const,
        detail: "Structured findings are available, but the meeting completed in fallback mode.",
      };
    case "needs_retry":
      return {
        label: "Needs Retry",
        tone: "danger" as const,
        detail: "The pipeline did not complete cleanly and needs operator attention.",
      };
    default:
      return {
        label: "Processing",
        tone: "neutral" as const,
        detail: "The AI pipeline is still running for this meeting.",
      };
  }
}

export function getTranscriptLifecycleCopy(availability: TranscriptAvailability) {
  switch (availability.status) {
    case "available":
      return "Temporary transcript available";
    case "not_ready":
      return "Transcript still processing";
    case "expired":
      return "Transcript expired by policy";
    case "deleted":
      return "Transcript deleted by retention policy";
    case "local_only":
      return "Transcript available on desktop only";
    default:
      return "Structured outputs only";
  }
}

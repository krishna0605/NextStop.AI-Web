import { NextResponse } from "next/server";

import { buildDownloadFilename, internalServerErrorResponse } from "@/lib/http";
import { downloadTranscriptForMeeting } from "@/lib/ai-pipeline";
import {
  completeMeetingExport,
  failMeetingExport,
  startMeetingExport,
} from "@/lib/meeting-exports";
import { enforceRateLimit, recordSecurityAudit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

function buildPolicyError(args: {
  error: string;
  code: string;
  status: number;
  transcriptAvailability?: unknown;
  retryAfterSeconds?: number | null;
  policyName?: string;
}) {
  return NextResponse.json(
    {
      error: args.error,
      code: args.code,
      transcriptAvailability: args.transcriptAvailability ?? null,
      retryAfterSeconds: args.retryAfterSeconds ?? null,
      policyName: args.policyName ?? null,
    },
    { status: args.status }
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  let exportLog:
    | {
        exportId: string;
        startedAt: number;
      }
    | null = null;
  let userId: string | null = null;

  try {
    const { meetingId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    userId = user.id;

    const rateLimit = await enforceRateLimit({
      policyName: "transcript_download",
      userId: user.id,
      meetingId,
    });

    if (!rateLimit.allowed) {
      return buildPolicyError({
        error: "Transcript download rate limit reached. Retry in a few minutes.",
        code: "rate_limited",
        status: 429,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
        policyName: rateLimit.policyName,
      });
    }

    const transcriptResult = await downloadTranscriptForMeeting({
      meetingId,
      userId: user.id,
    });

    const meeting = transcriptResult.meeting;

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    }

    exportLog = await startMeetingExport({
      meetingId,
      userId: user.id,
      exportType: "transcript",
      destination:
        transcriptResult.availability.status === "local_only"
          ? "desktop local transcript"
          : "browser download",
      metadata: {
        availability_status: transcriptResult.availability.status,
      },
    });

    if (!transcriptResult.availability.downloadEnabled || !transcriptResult.transcript) {
      await recordSecurityAudit({
        type: "transcript_download_blocked",
        reason: transcriptResult.availability.status,
      });
      await failMeetingExport({
        exportId: exportLog.exportId,
        userId: user.id,
        startedAt: exportLog.startedAt,
        error: transcriptResult.availability.message,
        metadata: {
          availability_status: transcriptResult.availability.status,
        },
      });

      return NextResponse.json(
        {
          error: transcriptResult.availability.message,
          code:
            transcriptResult.availability.status === "not_ready"
              ? "transcript_not_ready"
              : transcriptResult.availability.status === "expired"
              ? "transcript_expired"
              : transcriptResult.availability.status === "deleted"
                ? "transcript_deleted"
                : transcriptResult.availability.status === "local_only"
                  ? "transcript_local_only"
                  : "transcript_disabled",
          transcriptAvailability: transcriptResult.availability,
        },
        { status: transcriptResult.availability.status === "not_ready" ? 409 : 410 }
      );
    }

    await recordSecurityAudit({ type: "transcript_download_granted" });

    await completeMeetingExport({
      exportId: exportLog.exportId,
      userId: user.id,
      status: "completed",
      destination: "browser download",
      startedAt: exportLog.startedAt,
      metadata: {
        availability_status: transcriptResult.availability.status,
        byte_size: Buffer.byteLength(transcriptResult.transcript, "utf8"),
      },
    });

    return new NextResponse(transcriptResult.transcript, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${buildDownloadFilename(
          meeting.title,
          "transcript",
          "txt"
        )}"`,
      },
    });
  } catch (error) {
    if (exportLog && userId) {
      await failMeetingExport({
        exportId: exportLog.exportId,
        userId,
        startedAt: exportLog.startedAt,
        error: error instanceof Error ? error.message : "Unable to download the transcript.",
      }).catch((logError) => {
        console.error("[workspace] Failed to record transcript export failure", logError);
      });
    }

    return internalServerErrorResponse(
      "Unable to download the transcript.",
      error,
      "[workspace] Failed to download transcript"
    );
  }
}

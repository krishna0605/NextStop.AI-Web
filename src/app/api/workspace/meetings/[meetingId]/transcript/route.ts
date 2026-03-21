import { NextResponse } from "next/server";

import { buildDownloadFilename, internalServerErrorResponse } from "@/lib/http";
import { consumeEphemeralTranscript, getTranscriptAvailability } from "@/lib/workspace-runtime";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: meeting, error: meetingError } = await admin
      .from("web_meetings")
      .select("id, title")
      .eq("id", meetingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (meetingError) {
      throw meetingError;
    }

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    }

    const availability = getTranscriptAvailability(meetingId);

    if (!availability.downloadEnabled) {
      return NextResponse.json(
        {
          error: availability.message,
          transcriptAvailability: availability,
        },
        { status: availability.status === "disabled" ? 410 : 404 }
      );
    }

    const transcript = consumeEphemeralTranscript(meetingId);

    if (!transcript?.transcript) {
      return NextResponse.json(
        {
          error: "The transcript is no longer available. It may already have been downloaded or expired.",
          transcriptAvailability: getTranscriptAvailability(meetingId),
        },
        { status: 404 }
      );
    }

    await admin.from("meeting_exports").insert({
      meeting_id: meetingId,
      user_id: user.id,
      export_type: "transcript",
      status: "downloaded_once",
    });

    return new NextResponse(transcript.transcript, {
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
    return internalServerErrorResponse(
      "Unable to download the transcript.",
      error,
      "[workspace] Failed to download transcript"
    );
  }
}

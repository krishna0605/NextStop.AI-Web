import { NextResponse } from "next/server";

import { buildDownloadFilename, internalServerErrorResponse } from "@/lib/http";
import { downloadTranscriptForMeeting } from "@/lib/ai-pipeline";
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

    const transcriptResult = await downloadTranscriptForMeeting({
      meetingId,
      userId: user.id,
    });

    if (!transcriptResult.availability.downloadEnabled || !transcriptResult.transcript) {
      return NextResponse.json(
        {
          error: transcriptResult.availability.message,
          transcriptAvailability: transcriptResult.availability,
        },
        {
          status:
            transcriptResult.availability.status === "disabled" ||
            transcriptResult.availability.status === "local_only"
              ? 410
              : 404,
        }
      );
    }

    await admin.from("meeting_exports").insert({
      meeting_id: meetingId,
      user_id: user.id,
      export_type: "transcript",
      status: "downloaded",
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
    return internalServerErrorResponse(
      "Unable to download the transcript.",
      error,
      "[workspace] Failed to download transcript"
    );
  }
}

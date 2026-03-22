import { NextResponse } from "next/server";

import { createMeetingAudioUploadTarget } from "@/lib/ai-pipeline";
import { internalServerErrorResponse } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      filename?: string;
    };

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
      .select("id")
      .eq("id", meetingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (meetingError) {
      throw meetingError;
    }

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    }

    const upload = await createMeetingAudioUploadTarget({
      meetingId,
      userId: user.id,
      filename: body.filename?.trim() || "meeting-capture.webm",
    });

    return NextResponse.json(upload);
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to prepare the audio upload.",
      error,
      "[workspace] Failed to create meeting upload URL"
    );
  }
}

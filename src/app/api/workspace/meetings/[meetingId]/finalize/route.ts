import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { transcribeWithDeepgram } from "@/lib/deepgram";
import { generateMeetingFindings } from "@/lib/workspace-ai";
import { rememberEphemeralTranscript } from "@/lib/workspace-runtime";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import type { WebMeetingRecord } from "@/lib/workspace";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const contentType = request.headers.get("content-type") || "";

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
      .select("*")
      .eq("id", meetingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (meetingError) {
      throw meetingError;
    }

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    }

    const meetingRecord = meeting as WebMeetingRecord;
    let sourceText = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const audio = formData.get("audio");

      if (audio instanceof File && audio.size > 0) {
        sourceText = await transcribeWithDeepgram(
          audio,
          typeof formData.get("mimeType") === "string"
            ? String(formData.get("mimeType"))
            : audio.type
        );
      }
    } else {
      const body = (await request.json().catch(() => ({}))) as {
        sourceText?: string;
      };
      sourceText = body.sourceText?.trim() || "";
    }

    if (sourceText) {
      rememberEphemeralTranscript(meetingId, sourceText);
    }

    await admin
      .from("web_meetings")
      .update({
        status: "processing",
        ended_at: new Date().toISOString(),
      })
      .eq("id", meetingId)
      .eq("user_id", user.id);

    const findings = await generateMeetingFindings(meetingRecord.title, sourceText);

    const { error: findingsError } = await admin.from("meeting_findings").upsert(
      {
        meeting_id: meetingId,
        user_id: user.id,
        status: "ready",
        summary_short: findings.summaryShort,
        summary_full: findings.summaryFull,
        executive_bullets_json: findings.executiveBullets,
        decisions_json: findings.decisions,
        action_items_json: findings.actionItems,
        risks_json: findings.risks,
        follow_ups_json: findings.followUps,
        email_draft: findings.emailDraft,
        source_model: findings.sourceModel,
      },
      {
        onConflict: "meeting_id",
      }
    );

    if (findingsError) {
      throw findingsError;
    }

    const { error: meetingUpdateError } = await admin
      .from("web_meetings")
      .update({
        status: "ready",
        ended_at: new Date().toISOString(),
      })
      .eq("id", meetingId)
      .eq("user_id", user.id);

    if (meetingUpdateError) {
      throw meetingUpdateError;
    }

    return NextResponse.json({
      meetingId,
      redirectTo: `/dashboard/review/${meetingId}`,
      sourceModel: findings.sourceModel,
    });
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to finalize the meeting session.",
      error,
      "[workspace] Failed to finalize meeting session"
    );
  }
}

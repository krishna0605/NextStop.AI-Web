import { NextResponse } from "next/server";

import { loadAiStatusSnapshot, queueArtifactRegeneration } from "@/lib/ai-pipeline";
import { internalServerErrorResponse } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import type { MeetingArtifactType } from "@/lib/workspace";

export const runtime = "nodejs";

function isAllowedArtifact(value: string): value is Extract<
  MeetingArtifactType,
  "summary" | "action_items" | "email_draft"
> {
  return value === "summary" || value === "action_items" || value === "email_draft";
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ meetingId: string; artifact: string }> }
) {
  try {
    const { meetingId, artifact } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!isAllowedArtifact(artifact)) {
      return NextResponse.json({ error: "Unsupported artifact type." }, { status: 400 });
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

    const job = await queueArtifactRegeneration({
      meetingId,
      userId: user.id,
      artifactType: artifact,
    });
    const aiStatus = await loadAiStatusSnapshot(meetingId, user.id);

    return NextResponse.json({
      ...job,
      aiStatus,
    });
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to regenerate the artifact.",
      error,
      "[workspace] Failed to regenerate meeting artifact"
    );
  }
}

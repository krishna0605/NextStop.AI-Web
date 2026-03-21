import { NextResponse } from "next/server";

import { loadAiStatusSnapshot } from "@/lib/ai-pipeline";
import { internalServerErrorResponse } from "@/lib/http";
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

    const aiStatus = await loadAiStatusSnapshot(meetingId, user.id);

    if (!aiStatus) {
      return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    }

    return NextResponse.json(aiStatus);
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to load the AI status for this meeting.",
      error,
      "[workspace] Failed to load meeting AI status"
    );
  }
}

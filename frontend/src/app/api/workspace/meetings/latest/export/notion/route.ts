import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase-admin";
import { exportMeetingToNotion, NotionIntegrationError } from "@/lib/notion-workspace";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: latestMeeting, error: latestMeetingError } = await admin
      .from("web_meetings")
      .select("id,title")
      .eq("user_id", user.id)
      .in("status", ["ready", "partial_success"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestMeetingError) {
      throw latestMeetingError;
    }

    if (!latestMeeting) {
      return NextResponse.json(
        { error: "Finish a session first to sync findings to Notion." },
        { status: 409 }
      );
    }

    const payload = await exportMeetingToNotion(user.id, latestMeeting.id);

    return NextResponse.json({
      ok: true,
      meetingId: latestMeeting.id,
      meetingTitle: latestMeeting.title,
      message: "The latest meeting findings were exported to Notion successfully.",
      pageUrl: payload.pageUrl,
    });
  } catch (error) {
    if (error instanceof NotionIntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return internalServerErrorResponse(
      "Unable to export the latest findings to Notion.",
      error,
      "[workspace] Failed to export latest findings to Notion"
    );
  }
}

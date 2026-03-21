import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const [
      { data: google },
      { data: notion },
      { data: latestMeeting },
      { data: latestScheduledGoogleMeeting },
      { data: activeMeeting },
    ] = await Promise.all([
      supabase
        .from("integrations_google")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("integrations_notion")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("web_meetings")
        .select("id,title")
        .eq("user_id", user.id)
        .in("status", ["ready", "partial_success"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("web_meetings")
        .select("id,title,google_event_id,session_metadata")
        .eq("user_id", user.id)
        .eq("source_type", "google_meet")
        .in("status", ["scheduled", "draft"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("web_meetings")
        .select("id,title,status")
        .eq("user_id", user.id)
        .in("status", ["capturing", "queued", "transcribing", "analyzing", "processing"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      googleConnected: google?.status === "connected",
      notionConnected: notion?.status === "connected",
      latestCompletedMeeting: latestMeeting
        ? {
            id: latestMeeting.id,
            title: latestMeeting.title,
          }
        : null,
      latestScheduledGoogleMeeting: latestScheduledGoogleMeeting
        ? {
            id: latestScheduledGoogleMeeting.id,
            title: latestScheduledGoogleMeeting.title,
            googleEventId: latestScheduledGoogleMeeting.google_event_id ?? null,
            meetUrl:
              latestScheduledGoogleMeeting.session_metadata &&
              typeof latestScheduledGoogleMeeting.session_metadata === "object"
                ? latestScheduledGoogleMeeting.session_metadata["meet_url"] ?? null
                : null,
          }
        : null,
      activeMeeting: activeMeeting
        ? {
            id: activeMeeting.id,
            title: activeMeeting.title,
            status: activeMeeting.status,
          }
        : null,
    });
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to load the capture island context.",
      error,
      "[workspace] Failed to load capture island context"
    );
  }
}

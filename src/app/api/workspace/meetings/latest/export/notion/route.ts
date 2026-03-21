import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase-admin";
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
    const [{ data: notionIntegration, error: integrationError }, { data: latestMeeting, error: latestMeetingError }] =
      await Promise.all([
        admin
          .from("integrations_notion")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        admin
          .from("web_meetings")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "ready")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (integrationError) {
      throw integrationError;
    }

    if (latestMeetingError) {
      throw latestMeetingError;
    }

    if (!notionIntegration || notionIntegration.status !== "connected") {
      return NextResponse.json(
        { error: "Connect Notion and choose a destination before syncing there." },
        { status: 409 }
      );
    }

    if (!latestMeeting) {
      return NextResponse.json(
        { error: "Finish a session first to sync findings to Notion." },
        { status: 409 }
      );
    }

    const { data: findings } = await admin
      .from("meeting_findings")
      .select("meeting_id")
      .eq("meeting_id", latestMeeting.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!findings) {
      return NextResponse.json(
        { error: "The latest meeting does not have findings ready for export yet." },
        { status: 409 }
      );
    }

    await admin.from("meeting_exports").insert({
      meeting_id: latestMeeting.id,
      user_id: user.id,
      export_type: "notion",
      status: "queued_for_backend_integration",
      destination: notionIntegration.selected_destination_name ?? "configured destination",
    });

    return NextResponse.json({
      ok: true,
      meetingId: latestMeeting.id,
      meetingTitle: latestMeeting.title,
      message: "The latest meeting findings were queued for Notion export.",
    });
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to queue the latest Notion export.",
      error,
      "[workspace] Failed to queue latest Notion export"
    );
  }
}

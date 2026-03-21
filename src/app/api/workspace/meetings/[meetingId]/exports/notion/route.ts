import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(
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
    const { data: notionIntegration, error: integrationError } = await admin
      .from("integrations_notion")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (integrationError) {
      throw integrationError;
    }

    if (!notionIntegration || notionIntegration.status !== "connected") {
      return NextResponse.json(
        { error: "Connect Notion and select a destination before exporting there." },
        { status: 409 }
      );
    }

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

    await admin.from("meeting_exports").insert({
      meeting_id: meetingId,
      user_id: user.id,
      export_type: "notion",
      status: "queued_for_backend_integration",
      destination: notionIntegration.selected_destination_name ?? "configured destination",
    });

    return NextResponse.json({
      ok: true,
      message:
        "The Notion export was queued in the workspace history. The destination wiring is ready for the provider-backed integration step.",
    });
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to queue the Notion export.",
      error,
      "[workspace] Failed to queue Notion export"
    );
  }
}

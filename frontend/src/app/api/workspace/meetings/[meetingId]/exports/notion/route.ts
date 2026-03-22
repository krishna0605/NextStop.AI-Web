import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { exportMeetingToNotion, NotionIntegrationError } from "@/lib/notion-workspace";
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

    const payload = await exportMeetingToNotion(user.id, meetingId);

    return NextResponse.json({
      ok: true,
      message: "The findings were exported to Notion successfully.",
      pageUrl: payload.pageUrl,
    });
  } catch (error) {
    if (error instanceof NotionIntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return internalServerErrorResponse(
      "Unable to export the findings to Notion.",
      error,
      "[workspace] Failed to export findings to Notion"
    );
  }
}

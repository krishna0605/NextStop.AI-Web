import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import { normalizeTags, type MeetingSourceType } from "@/lib/workspace";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      meetingId?: string;
      title?: string;
      sourceType?: MeetingSourceType;
      tags?: string[];
    };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const admin = createAdminClient();
    const title =
      body.title?.trim() ||
      `Browser Meeting - ${new Intl.DateTimeFormat("en-IN", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date())}`;
    const sourceType = body.sourceType ?? "browser_tab";

    if (!["google_meet", "browser_tab", "quick_notes"].includes(sourceType)) {
      return NextResponse.json({ error: "Unsupported session source." }, { status: 400 });
    }

    if (body.meetingId) {
      const { data: existing, error: existingError } = await admin
        .from("web_meetings")
        .select("*")
        .eq("id", body.meetingId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (!existing) {
        return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
      }

      const { data, error } = await admin
        .from("web_meetings")
        .update({
          title: title || existing.title,
          status: "capturing",
          started_at: new Date().toISOString(),
          session_metadata: {
            ...(existing.session_metadata ?? {}),
            capture_origin: "workspace_capture_island",
          },
        })
        .eq("id", existing.id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        meetingId: data.id,
        title: data.title,
        redirectTo: "/dashboard",
      });
    }

    const { data, error } = await admin
      .from("web_meetings")
      .insert({
        user_id: user.id,
        title,
        source_type: sourceType,
        status: "capturing",
        tags: normalizeTags(body.tags),
        started_at: new Date().toISOString(),
        session_metadata: {
          capture_mode: sourceType,
          created_from: "workspace_capture_island",
        },
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      meetingId: data.id,
      title: data.title,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to start the browser meeting workspace.",
      error,
      "[workspace] Failed to start meeting workspace"
    );
  }
}

import { NextResponse } from "next/server";

import { queueMeetingProcessing } from "@/lib/ai-pipeline";
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
      bucket?: string;
      path?: string;
      mimeType?: string;
      byteSize?: number;
      checksum?: string;
      sourceText?: string;
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

    const payload = await queueMeetingProcessing({
      meetingId,
      userId: user.id,
      audioAsset:
        body.bucket && body.path
          ? {
              bucket: body.bucket,
              path: body.path,
              mimeType: body.mimeType ?? null,
              byteSize: typeof body.byteSize === "number" ? body.byteSize : null,
              checksum: body.checksum ?? null,
            }
          : null,
      sourceText: body.sourceText?.trim(),
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error) {
      console.error("[workspace] Failed to queue meeting processing", {
        message: error.message,
        stack: error.stack,
      });

      return NextResponse.json(
        { error: error.message || "Unable to queue AI processing for this meeting." },
        { status: 500 }
      );
    }

    console.error("[workspace] Failed to queue meeting processing", error);
    return NextResponse.json(
      { error: "Unable to queue AI processing for this meeting." },
      { status: 500 }
    );
  }
}

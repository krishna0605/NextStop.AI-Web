import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { createClient } from "@/lib/supabase-server";
import { createCaptureChunkUploadTarget } from "@/lib/workspace-capture-server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      captureSessionId?: string;
      chunkIndex?: number;
      filename?: string;
      mimeType?: string;
    };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!body.captureSessionId || typeof body.chunkIndex !== "number") {
      return NextResponse.json(
        { error: "captureSessionId and chunkIndex are required." },
        { status: 400 }
      );
    }

    const upload = await createCaptureChunkUploadTarget({
      meetingId,
      userId: user.id,
      captureSessionId: body.captureSessionId,
      chunkIndex: body.chunkIndex,
      filename: body.filename?.trim() || `capture-${body.chunkIndex}.webm`,
      mimeType: body.mimeType?.trim() || null,
    });

    return NextResponse.json(upload);
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to prepare the capture chunk upload.",
      error,
      "[workspace] Failed to prepare capture chunk upload"
    );
  }
}

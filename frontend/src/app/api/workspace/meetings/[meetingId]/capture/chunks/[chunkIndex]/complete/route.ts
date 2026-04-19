import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { createClient } from "@/lib/supabase-server";
import { completeCaptureChunkUpload } from "@/lib/workspace-capture-server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ meetingId: string; chunkIndex: string }> }
) {
  try {
    const { meetingId, chunkIndex } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      captureSessionId?: string;
      byteSize?: number;
      checksum?: string;
    };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!body.captureSessionId) {
      return NextResponse.json({ error: "captureSessionId is required." }, { status: 400 });
    }

    const result = await completeCaptureChunkUpload({
      meetingId,
      userId: user.id,
      captureSessionId: body.captureSessionId,
      chunkIndex: Number(chunkIndex),
      byteSize: typeof body.byteSize === "number" ? body.byteSize : null,
      checksum: body.checksum ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to confirm the capture chunk upload.",
      error,
      "[workspace] Failed to confirm capture chunk upload"
    );
  }
}

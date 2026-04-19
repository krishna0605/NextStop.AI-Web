import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { createClient } from "@/lib/supabase-server";
import { heartbeatCaptureSession } from "@/lib/workspace-capture-server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      captureSessionId?: string;
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

    const result = await heartbeatCaptureSession({
      meetingId,
      userId: user.id,
      captureSessionId: body.captureSessionId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to refresh the capture heartbeat.",
      error,
      "[workspace] Failed to refresh capture heartbeat"
    );
  }
}

import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { createClient } from "@/lib/supabase-server";
import { cancelMeetingProcessing } from "@/lib/workspace-capture-server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      reason?: string;
    };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const result = await cancelMeetingProcessing({
      meetingId,
      userId: user.id,
      reason: body.reason ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && /can no longer be canceled/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return internalServerErrorResponse(
      "Unable to cancel this meeting.",
      error,
      "[workspace] Failed to cancel meeting processing"
    );
  }
}

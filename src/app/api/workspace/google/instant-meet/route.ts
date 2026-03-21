import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { createClient } from "@/lib/supabase-server";
import {
  createGoogleMeetEvent,
  getGoogleAccessToken,
  upsertGoogleMeetingRecord,
} from "@/lib/google-workspace";

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

    const { integration, accessToken } = await getGoogleAccessToken(user.id);
    const start = new Date();
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const calendarId = integration.selected_calendar_id || "primary";

    const event = await createGoogleMeetEvent({
      accessToken,
      calendarId,
      summary: "Instant NextStop meeting",
      description: "Created from the NextStop web workspace.",
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    });
    const meeting = await upsertGoogleMeetingRecord({
      userId: user.id,
      googleEventId: event.id ?? crypto.randomUUID(),
      title: "Instant NextStop meeting",
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      meetUrl: event.hangoutLink ?? event.htmlLink ?? null,
      eventUrl: event.htmlLink ?? null,
      status: "draft",
      createdFrom: "google_instant_meet",
    });

    return NextResponse.json({
      meetingId: meeting.id,
      googleEventId: meeting.google_event_id ?? event.id ?? null,
      title: meeting.title,
      meetUrl: event.hangoutLink ?? event.htmlLink ?? null,
      eventUrl: event.htmlLink ?? null,
    });
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to create the instant Google Meet.",
      error,
      "[workspace] Failed to create instant Google Meet"
    );
  }
}

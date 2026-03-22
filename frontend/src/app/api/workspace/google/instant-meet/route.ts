import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { createClient } from "@/lib/supabase-server";
import {
  createGoogleMeetEvent,
  GoogleIntegrationError,
  upsertGoogleMeetingRecord,
  withGoogleAccessToken,
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

    const payload = await withGoogleAccessToken(user.id, async ({ integration, accessToken }) => {
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

      return {
        meetingId: meeting.id,
        googleEventId: meeting.google_event_id ?? event.id ?? null,
        title: meeting.title,
        meetUrl: event.hangoutLink ?? event.htmlLink ?? null,
        eventUrl: event.htmlLink ?? null,
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof GoogleIntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return internalServerErrorResponse(
      "Unable to create the instant Google Meet.",
      error,
      "[workspace] Failed to create instant Google Meet"
    );
  }
}

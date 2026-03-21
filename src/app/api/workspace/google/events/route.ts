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

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      summary?: string;
      description?: string;
      startIso?: string;
      endIso?: string;
      attendees?: string[];
      calendarId?: string;
    };

    if (!body.summary?.trim() || !body.startIso || !body.endIso) {
      return NextResponse.json(
        { error: "Title, start time, and end time are required." },
        { status: 400 }
      );
    }
    const summary = body.summary.trim();
    const startIso = body.startIso;
    const endIso = body.endIso;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const payload = await withGoogleAccessToken(user.id, async ({ integration, accessToken }) => {
      const event = await createGoogleMeetEvent({
        accessToken,
        calendarId: body.calendarId || integration.selected_calendar_id || "primary",
        summary,
        description: body.description?.trim(),
        startIso,
        endIso,
        attendees: Array.isArray(body.attendees) ? body.attendees : [],
      });
      const meeting = await upsertGoogleMeetingRecord({
        userId: user.id,
        googleEventId: event.id ?? crypto.randomUUID(),
        title: summary,
        startIso,
        endIso,
        meetUrl: event.hangoutLink ?? event.htmlLink ?? null,
        eventUrl: event.htmlLink ?? null,
        status: "scheduled",
        createdFrom: "google_schedule",
      });

      return {
        meetingId: meeting.id,
        googleEventId: meeting.google_event_id ?? event.id ?? null,
        title: meeting.title,
        eventUrl: event.htmlLink ?? null,
        meetUrl: event.hangoutLink ?? event.htmlLink ?? null,
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof GoogleIntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return internalServerErrorResponse(
      "Unable to create the Google Meet event.",
      error,
      "[workspace] Failed to create Google Meet event"
    );
  }
}

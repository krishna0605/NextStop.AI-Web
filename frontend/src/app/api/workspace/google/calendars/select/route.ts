import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { createClient } from "@/lib/supabase-server";
import {
  GoogleIntegrationError,
  listGoogleCalendars,
  saveSelectedGoogleCalendar,
  withGoogleAccessToken,
} from "@/lib/google-workspace";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      calendarId?: string;
    };

    if (!body.calendarId) {
      return NextResponse.json({ error: "Calendar is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const calendars = await withGoogleAccessToken(user.id, async ({ accessToken }) =>
      listGoogleCalendars(accessToken)
    );
    const selectedCalendar = calendars.find((calendar) => calendar.id === body.calendarId);

    if (!selectedCalendar) {
      return NextResponse.json({ error: "Selected calendar was not found." }, { status: 404 });
    }

    await saveSelectedGoogleCalendar(user.id, selectedCalendar.id, selectedCalendar.summary);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof GoogleIntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return internalServerErrorResponse(
      "Unable to save the selected calendar.",
      error,
      "[workspace] Failed to save selected Google calendar"
    );
  }
}

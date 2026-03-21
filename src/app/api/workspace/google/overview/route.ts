import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { createClient } from "@/lib/supabase-server";
import {
  getGoogleAccessToken,
  listGoogleCalendars,
  listUpcomingGoogleEvents,
} from "@/lib/google-workspace";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { integration, accessToken } = await getGoogleAccessToken(user.id);
    const calendars = await listGoogleCalendars(accessToken);
    const selectedCalendarId =
      integration.selected_calendar_id ||
      calendars.find((calendar) => calendar.primary)?.id ||
      calendars[0]?.id ||
      "";
    const events = selectedCalendarId
      ? await listUpcomingGoogleEvents(accessToken, selectedCalendarId)
      : [];

    return NextResponse.json({
      calendars,
      selectedCalendarId,
      events,
    });
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to load the Google workspace overview.",
      error,
      "[workspace] Failed to load Google workspace overview"
    );
  }
}

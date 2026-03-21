import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { createClient } from "@/lib/supabase-server";
import {
  GoogleIntegrationError,
  listGoogleCalendars,
  listUpcomingGoogleEvents,
  withGoogleAccessToken,
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

    const payload = await withGoogleAccessToken(user.id, async ({ integration, accessToken }) => {
      const calendars = await listGoogleCalendars(accessToken);
      const selectedCalendarId =
        integration.selected_calendar_id ||
        calendars.find((calendar) => calendar.primary)?.id ||
        calendars[0]?.id ||
        "";
      const events = selectedCalendarId
        ? await listUpcomingGoogleEvents(accessToken, selectedCalendarId)
        : [];

      return {
        calendars,
        selectedCalendarId,
        events,
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof GoogleIntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return internalServerErrorResponse(
      "Unable to load the Google workspace overview.",
      error,
      "[workspace] Failed to load Google workspace overview"
    );
  }
}

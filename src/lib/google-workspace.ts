import "server-only";

import { createAdminClient } from "@/lib/supabase-admin";
import type { IntegrationRecord } from "@/lib/workspace";

type IntegrationMetadata = Record<string, unknown> | null | undefined;

export type GoogleCalendarOption = {
  id: string;
  summary: string;
  primary: boolean;
};

export type GoogleEventSummary = {
  id: string;
  summary: string;
  htmlLink: string | null;
  hangoutLink: string | null;
  start: string | null;
  end: string | null;
};

function getMetadataValue(metadata: IntegrationMetadata, key: string) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const value = metadata[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function getGoogleIntegration(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("integrations_google")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as IntegrationRecord | null) ?? null;
}

export async function getGoogleAccessToken(userId: string) {
  const integration = await getGoogleIntegration(userId);

  if (!integration || integration.status !== "connected") {
    throw new Error("Google is not connected for this account.");
  }

  const accessToken = getMetadataValue(integration.metadata, "provider_access_token");

  if (!accessToken) {
    throw new Error("Google access token is missing. Please reconnect Google.");
  }

  return {
    integration,
    accessToken,
  };
}

async function googleApiFetch<T>(accessToken: string, input: string, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | {
        error?: {
          message?: string;
        };
      }
    | null;

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error?.message
        ? payload.error.message
        : "Google API request failed.";

    throw new Error(message);
  }

  return payload as T;
}

export async function listGoogleCalendars(accessToken: string) {
  const payload = await googleApiFetch<{
    items?: Array<{
      id?: string;
      summary?: string;
      primary?: boolean;
    }>;
  }>(accessToken, "https://www.googleapis.com/calendar/v3/users/me/calendarList");

  return (payload.items ?? [])
    .filter((item): item is { id: string; summary?: string; primary?: boolean } => Boolean(item.id))
    .map((item) => ({
      id: item.id,
      summary: item.summary || item.id,
      primary: Boolean(item.primary),
    })) satisfies GoogleCalendarOption[];
}

export async function listUpcomingGoogleEvents(accessToken: string, calendarId: string) {
  const now = new Date().toISOString();
  const encodedCalendarId = encodeURIComponent(calendarId);
  const payload = await googleApiFetch<{
    items?: Array<{
      id?: string;
      summary?: string;
      htmlLink?: string | null;
      hangoutLink?: string | null;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }>;
  }>(
    accessToken,
    `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
      now
    )}&maxResults=8`
  );

  return (payload.items ?? [])
    .filter((item): item is NonNullable<typeof item> & { id: string } => Boolean(item.id))
    .map((item) => ({
      id: item.id,
      summary: item.summary || "Untitled event",
      htmlLink: item.htmlLink ?? null,
      hangoutLink: item.hangoutLink ?? null,
      start: item.start?.dateTime ?? item.start?.date ?? null,
      end: item.end?.dateTime ?? item.end?.date ?? null,
    })) satisfies GoogleEventSummary[];
}

export async function saveSelectedGoogleCalendar(
  userId: string,
  calendarId: string,
  calendarName: string
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("integrations_google")
    .update({
      selected_calendar_id: calendarId,
      selected_calendar_name: calendarName,
    })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function createGoogleMeetEvent(args: {
  accessToken: string;
  calendarId: string;
  summary: string;
  description?: string;
  startIso: string;
  endIso: string;
  attendees?: string[];
}) {
  const encodedCalendarId = encodeURIComponent(args.calendarId);
  return googleApiFetch<{
    id?: string;
    htmlLink?: string | null;
    hangoutLink?: string | null;
  }>(
    args.accessToken,
    `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      body: JSON.stringify({
        summary: args.summary,
        description: args.description ?? "",
        start: {
          dateTime: args.startIso,
          timeZone: "Asia/Kolkata",
        },
        end: {
          dateTime: args.endIso,
          timeZone: "Asia/Kolkata",
        },
        attendees: (args.attendees ?? []).map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
      }),
    }
  );
}

export async function upsertGoogleMeetingRecord(args: {
  userId: string;
  googleEventId: string;
  title: string;
  startIso: string;
  endIso: string;
  meetUrl?: string | null;
  eventUrl?: string | null;
  status?: "draft" | "scheduled" | "capturing" | "processing" | "ready" | "failed";
  createdFrom: "google_instant_meet" | "google_schedule";
}) {
  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("web_meetings")
    .select("*")
    .eq("user_id", args.userId)
    .eq("google_event_id", args.googleEventId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const payload = {
    title: args.title,
    source_type: "google_meet",
    status: args.status ?? "scheduled",
    google_event_id: args.googleEventId,
    session_metadata: {
      meet_url: args.meetUrl ?? null,
      event_url: args.eventUrl ?? null,
      scheduled_start: args.startIso,
      scheduled_end: args.endIso,
      created_from: args.createdFrom,
    },
  };

  if (existing) {
    const { data, error } = await admin
      .from("web_meetings")
      .update(payload)
      .eq("id", existing.id)
      .eq("user_id", args.userId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await admin
    .from("web_meetings")
    .insert({
      user_id: args.userId,
      title: args.title,
      source_type: "google_meet",
      status: args.status ?? "scheduled",
      google_event_id: args.googleEventId,
      started_at: null,
      ended_at: null,
      session_metadata: payload.session_metadata,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

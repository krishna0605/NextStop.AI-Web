import { POST as selectCalendar } from "@/app/api/workspace/google/calendars/select/route";
import { POST as createGoogleEvent } from "@/app/api/workspace/google/events/route";
import { POST as instantMeet } from "@/app/api/workspace/google/instant-meet/route";
import { GET as googleOverview } from "@/app/api/workspace/google/overview/route";
import { GET as notionCallback } from "@/app/api/workspace/notion/callback/route";
import { POST as notionConnect } from "@/app/api/workspace/notion/connect/route";
import {
  createGoogleMeetEvent,
  GoogleIntegrationError,
  listGoogleCalendars,
  listUpcomingGoogleEvents,
  saveSelectedGoogleCalendar,
  upsertGoogleMeetingRecord,
  withGoogleAccessToken,
} from "@/lib/google-workspace";
import { getNotionOAuthConfigured } from "@/lib/env";
import {
  buildNotionAuthorizeUrl,
  exchangeNotionAuthorizationCode,
  upsertNotionConnection,
  verifyNotionState,
} from "@/lib/notion-workspace";
import { createClient } from "@/lib/supabase-server";

vi.mock("@/lib/env", () => ({
  getNotionOAuthConfigured: vi.fn(),
}));

vi.mock("@/lib/google-workspace", () => {
  class MockGoogleIntegrationError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }

  return {
    createGoogleMeetEvent: vi.fn(),
    GoogleIntegrationError: MockGoogleIntegrationError,
    listGoogleCalendars: vi.fn(),
    listUpcomingGoogleEvents: vi.fn(),
    saveSelectedGoogleCalendar: vi.fn(),
    upsertGoogleMeetingRecord: vi.fn(),
    withGoogleAccessToken: vi.fn(),
  };
});

vi.mock("@/lib/notion-workspace", () => ({
  buildNotionAuthorizeUrl: vi.fn(),
  exchangeNotionAuthorizationCode: vi.fn(),
  getNotionAppUrl: vi.fn((origin: string) => origin),
  upsertNotionConnection: vi.fn(),
  verifyNotionState: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(),
}));

function jsonRequest(path: string, payload: unknown) {
  return new Request(`https://nextstop.ai${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

function mockSupabaseUser(user: { id: string; email?: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user,
        },
      })),
    },
  } as never);
}

function installGoogleTokenMock() {
  vi.mocked(withGoogleAccessToken).mockImplementation(
    async (
      userId: string,
      callback: (args: {
        integration: { selected_calendar_id: string | null };
        accessToken: string;
      }) => Promise<unknown>
    ) =>
      callback({
        accessToken: `token-for-${userId}`,
        integration: {
          selected_calendar_id: "primary",
        },
      }) as never
  );
}

describe("workspace integration route guardrails", () => {
  beforeEach(() => {
    mockSupabaseUser({ id: "user_123", email: "user@example.com" });
    installGoogleTokenMock();
    vi.mocked(listGoogleCalendars).mockResolvedValue([
      { id: "primary", summary: "Primary", primary: true },
      { id: "team", summary: "Team" },
    ] as never);
    vi.mocked(listUpcomingGoogleEvents).mockResolvedValue([
      { id: "event_123", summary: "Planning" },
    ] as never);
    vi.mocked(createGoogleMeetEvent).mockResolvedValue({
      id: "event_123",
      htmlLink: "https://calendar.example.com/event_123",
      hangoutLink: "https://meet.google.com/abc-defg-hij",
    } as never);
    vi.mocked(upsertGoogleMeetingRecord).mockResolvedValue({
      id: "meeting_123",
      google_event_id: "event_123",
      title: "Planning",
    } as never);
    vi.mocked(getNotionOAuthConfigured).mockReturnValue(true);
    vi.mocked(buildNotionAuthorizeUrl).mockReturnValue("https://notion.example.com/oauth");
    vi.mocked(verifyNotionState).mockReturnValue({
      userId: "user_123",
      redirectUri: "https://nextstop.ai/api/workspace/notion/callback",
    });
    vi.mocked(exchangeNotionAuthorizationCode).mockResolvedValue({
      access_token: "notion-token",
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication before starting the Notion OAuth flow", async () => {
    mockSupabaseUser(null);

    const response = await notionConnect(jsonRequest("/api/workspace/notion/connect", {}));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(buildNotionAuthorizeUrl).not.toHaveBeenCalled();
  });

  it("returns a configured Notion authorization URL for authenticated users", async () => {
    const response = await notionConnect(jsonRequest("/api/workspace/notion/connect", {}));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      authorizeUrl: "https://notion.example.com/oauth",
    });
    expect(buildNotionAuthorizeUrl).toHaveBeenCalledWith("user_123", "https://nextstop.ai");
  });

  it("redirects Notion callbacks with missing state to a safe dashboard URL", async () => {
    const response = await notionCallback(
      new Request("https://nextstop.ai/api/workspace/notion/callback?code=abc")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard/notion");
    expect(response.headers.get("location")).toContain("integration_error=invalid_callback");
    expect(exchangeNotionAuthorizationCode).not.toHaveBeenCalled();
  });

  it("exchanges valid Notion callbacks and stores the user-scoped connection", async () => {
    const response = await notionCallback(
      new Request(
        "https://nextstop.ai/api/workspace/notion/callback?code=abc&state=signed-state"
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("connected=1");
    expect(exchangeNotionAuthorizationCode).toHaveBeenCalledWith(
      "abc",
      "https://nextstop.ai/api/workspace/notion/callback"
    );
    expect(upsertNotionConnection).toHaveBeenCalledWith({
      userId: "user_123",
      token: { access_token: "notion-token" },
    });
  });

  it("requires title and time fields before creating Google calendar events", async () => {
    const response = await createGoogleEvent(jsonRequest("/api/workspace/google/events", {}));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Title, start time, and end time are required.",
    });
    expect(withGoogleAccessToken).not.toHaveBeenCalled();
  });

  it("returns provider errors from Google overview without masking status codes", async () => {
    vi.mocked(withGoogleAccessToken).mockRejectedValueOnce(
      new GoogleIntegrationError("Reconnect Google", 409)
    );

    const response = await googleOverview();

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Reconnect Google" });
  });

  it("loads Google overview with calendar and event data", async () => {
    const response = await googleOverview();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      calendars: [
        { id: "primary", summary: "Primary", primary: true },
        { id: "team", summary: "Team" },
      ],
      selectedCalendarId: "primary",
      events: [{ id: "event_123", summary: "Planning" }],
    });
  });

  it("rejects unknown selected calendars", async () => {
    const response = await selectCalendar(
      jsonRequest("/api/workspace/google/calendars/select", { calendarId: "unknown" })
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Selected calendar was not found." });
    expect(saveSelectedGoogleCalendar).not.toHaveBeenCalled();
  });

  it("creates instant Google Meet records for authenticated users", async () => {
    const response = await instantMeet(jsonRequest("/api/workspace/google/instant-meet", {}));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      meetingId: "meeting_123",
      googleEventId: "event_123",
      title: "Planning",
      meetUrl: "https://meet.google.com/abc-defg-hij",
      eventUrl: "https://calendar.example.com/event_123",
    });
    expect(createGoogleMeetEvent).toHaveBeenCalled();
    expect(upsertGoogleMeetingRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_123",
        googleEventId: "event_123",
        createdFrom: "google_instant_meet",
      })
    );
  });
});

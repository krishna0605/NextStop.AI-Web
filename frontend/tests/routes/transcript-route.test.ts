const getUser = vi.fn();
const downloadTranscriptForMeeting = vi.fn();
const startMeetingExport = vi.fn();
const failMeetingExport = vi.fn();
const completeMeetingExport = vi.fn();
const enforceRateLimit = vi.fn();
const recordSecurityAudit = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createClient: async () => ({
    auth: {
      getUser,
    },
  }),
}));

vi.mock("@/lib/ai-pipeline", () => ({
  downloadTranscriptForMeeting,
}));

vi.mock("@/lib/meeting-exports", () => ({
  startMeetingExport,
  failMeetingExport,
  completeMeetingExport,
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit,
  recordSecurityAudit,
}));

describe("GET /api/workspace/meetings/[meetingId]/transcript", () => {
  beforeEach(() => {
    getUser.mockReset();
    downloadTranscriptForMeeting.mockReset();
    startMeetingExport.mockReset();
    failMeetingExport.mockReset();
    completeMeetingExport.mockReset();
    enforceRateLimit.mockReset();
    recordSecurityAudit.mockReset();

    getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    enforceRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: null,
      policyName: "transcript_download",
    });
    startMeetingExport.mockResolvedValue({
      exportId: "export-1",
      startedAt: 10,
    });
  });

  it("returns a structured 429 payload when transcript downloads are rate limited", async () => {
    const { GET } = await import("@/app/api/workspace/meetings/[meetingId]/transcript/route");
    enforceRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 120,
      policyName: "transcript_download",
    });

    const response = await GET(new Request("https://nextstop.ai"), {
      params: Promise.resolve({ meetingId: "meeting-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.code).toBe("rate_limited");
    expect(payload.retryAfterSeconds).toBe(120);
    expect(payload.policyName).toBe("transcript_download");
    expect(downloadTranscriptForMeeting).not.toHaveBeenCalled();
  });

  it("returns a transcript-expired policy response and records the blocked attempt", async () => {
    const { GET } = await import("@/app/api/workspace/meetings/[meetingId]/transcript/route");
    downloadTranscriptForMeeting.mockResolvedValue({
      meeting: {
        id: "meeting-1",
        title: "Weekly Sync",
      },
      transcript: null,
      availability: {
        status: "expired",
        downloadEnabled: false,
        message: "The temporary transcript is no longer available.",
        expiresAt: "2026-04-18T10:00:00.000Z",
      },
    });

    const response = await GET(new Request("https://nextstop.ai"), {
      params: Promise.resolve({ meetingId: "meeting-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(410);
    expect(payload.code).toBe("transcript_expired");
    expect(payload.transcriptAvailability.status).toBe("expired");
    expect(startMeetingExport).toHaveBeenCalled();
    expect(failMeetingExport).toHaveBeenCalled();
    expect(recordSecurityAudit).toHaveBeenCalledWith({
      type: "transcript_download_blocked",
      reason: "expired",
    });
  });

  it("returns a transcript-not-ready response while transcription is still running", async () => {
    const { GET } = await import("@/app/api/workspace/meetings/[meetingId]/transcript/route");
    downloadTranscriptForMeeting.mockResolvedValue({
      meeting: {
        id: "meeting-1",
        title: "Weekly Sync",
      },
      transcript: null,
      availability: {
        status: "not_ready",
        downloadEnabled: false,
        message: "Transcript is still processing.",
        expiresAt: null,
      },
    });

    const response = await GET(new Request("https://nextstop.ai"), {
      params: Promise.resolve({ meetingId: "meeting-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.code).toBe("transcript_not_ready");
    expect(payload.transcriptAvailability.status).toBe("not_ready");
    expect(recordSecurityAudit).toHaveBeenCalledWith({
      type: "transcript_download_blocked",
      reason: "not_ready",
    });
  });

  it("downloads the transcript and records a granted audit event", async () => {
    const { GET } = await import("@/app/api/workspace/meetings/[meetingId]/transcript/route");
    downloadTranscriptForMeeting.mockResolvedValue({
      meeting: {
        id: "meeting-1",
        title: "Weekly Sync",
      },
      transcript: "hello world",
      availability: {
        status: "available",
        downloadEnabled: true,
        message: "Transcript available",
        expiresAt: "2026-04-18T10:00:00.000Z",
      },
    });

    const response = await GET(new Request("https://nextstop.ai"), {
      params: Promise.resolve({ meetingId: "meeting-1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("hello world");
    expect(completeMeetingExport).toHaveBeenCalled();
    expect(recordSecurityAudit).toHaveBeenCalledWith({
      type: "transcript_download_granted",
    });
  });
});

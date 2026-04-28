import { POST as disconnectIntegration } from "@/app/api/workspace/integrations/disconnect/route";
import { POST as cancelMeeting } from "@/app/api/workspace/meetings/[meetingId]/cancel/route";
import { POST as finalizeMeeting } from "@/app/api/workspace/meetings/[meetingId]/finalize/route";
import { POST as processMeeting } from "@/app/api/workspace/meetings/[meetingId]/process/route";
import { POST as uploadUrl } from "@/app/api/workspace/meetings/[meetingId]/upload-url/route";
import { POST as startMeeting } from "@/app/api/workspace/meetings/start/route";
import { createMeetingAudioUploadTarget, queueMeetingProcessing } from "@/lib/ai-pipeline";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import {
  cancelMeetingProcessing,
  createMeetingCaptureSession,
  finalizeMeetingCaptureSession,
} from "@/lib/workspace-capture-server";

vi.mock("@/lib/ai-pipeline", () => ({
  createMeetingAudioUploadTarget: vi.fn(),
  queueMeetingProcessing: vi.fn(),
  uploadAudioAssetThroughServer: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/workspace-capture-server", () => ({
  cancelMeetingProcessing: vi.fn(),
  createMeetingCaptureSession: vi.fn(),
  finalizeMeetingCaptureSession: vi.fn(),
}));

function request(payload: unknown) {
  return new Request("https://nextstop.ai/api/workspace/test", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

function params(meetingId = "meeting_123") {
  return {
    params: Promise.resolve({ meetingId }),
  };
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

function makeQuery({
  maybeSingleData = { id: "meeting_123", title: "Release Readiness" },
  singleData = { id: "meeting_123", title: "Release Readiness" },
  error = null,
}: {
  maybeSingleData?: unknown;
  singleData?: unknown;
  error?: unknown;
} = {}) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    insert: vi.fn(() => query),
    upsert: vi.fn(() => query),
    update: vi.fn(() => query),
    single: vi.fn(async () => ({ data: singleData, error })),
    maybeSingle: vi.fn(async () => ({ data: maybeSingleData, error })),
  };

  return query;
}

function mockAdmin({
  meeting = { id: "meeting_123", title: "Release Readiness" },
}: {
  meeting?: unknown;
} = {}) {
  const webMeetings = makeQuery({
    maybeSingleData: meeting,
    singleData: meeting,
  });
  const integrations = makeQuery({ singleData: { ok: true } });
  const admin = {
    from: vi.fn((table: string) => (table === "web_meetings" ? webMeetings : integrations)),
  };
  vi.mocked(createAdminClient).mockReturnValue(admin as never);

  return { admin, webMeetings, integrations };
}

describe("workspace critical route guardrails", () => {
  beforeEach(() => {
    mockSupabaseUser({ id: "user_123", email: "user@example.com" });
    mockAdmin();
    vi.mocked(enforceRateLimit).mockResolvedValue({
      allowed: true,
      policyName: "test_policy",
      retryAfterSeconds: 0,
    });
    vi.mocked(createMeetingCaptureSession).mockResolvedValue({
      id: "capture_123",
    } as never);
    vi.mocked(queueMeetingProcessing).mockResolvedValue({
      queued: true,
      jobId: "job_123",
    } as never);
    vi.mocked(createMeetingAudioUploadTarget).mockResolvedValue({
      bucket: "meeting-audio",
      path: "user_123/meeting_123/audio.webm",
      uploadUrl: "https://upload.example.com",
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication before starting a meeting", async () => {
    mockSupabaseUser(null);

    const response = await startMeeting(request({ title: "Release Readiness" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects unsupported meeting source types", async () => {
    const response = await startMeeting(
      request({
        title: "Release Readiness",
        sourceType: "unsupported",
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Unsupported session source." });
  });

  it("starts a new browser capture session for authenticated users", async () => {
    const response = await startMeeting(
      request({
        title: "Release Readiness",
        sourceType: "browser_tab",
        tags: ["launch", "  readiness  "],
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        meetingId: "meeting_123",
        captureSessionId: "capture_123",
        redirectTo: "/dashboard",
      })
    );
    expect(createMeetingCaptureSession).toHaveBeenCalledWith({
      meetingId: "meeting_123",
      userId: "user_123",
      captureMode: "browser_tab",
    });
  });

  it("blocks upload target creation for meetings not owned by the user", async () => {
    mockAdmin({ meeting: null });

    const response = await uploadUrl(request({ filename: "call.webm" }), params());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Meeting not found." });
    expect(createMeetingAudioUploadTarget).not.toHaveBeenCalled();
  });

  it("returns rate-limit payloads before queueing meeting processing", async () => {
    vi.mocked(enforceRateLimit).mockResolvedValueOnce({
      allowed: false,
      policyName: "meeting_process",
      retryAfterSeconds: 120,
    });

    const response = await processMeeting(request({ sourceText: "notes" }), params());

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "AI processing rate limit reached. Retry in a few minutes.",
      code: "rate_limited",
      retryAfterSeconds: 120,
      policyName: "meeting_process",
    });
    expect(queueMeetingProcessing).not.toHaveBeenCalled();
  });

  it("finalizes existing capture sessions without queueing duplicate work", async () => {
    vi.mocked(finalizeMeetingCaptureSession).mockResolvedValueOnce({
      queued: true,
      jobId: "job_capture",
    } as never);

    const response = await finalizeMeeting(
      request({
        captureSessionId: "capture_123",
      }),
      params()
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        redirectTo: "/dashboard/review/meeting_123",
        jobId: "job_capture",
      })
    );
    expect(finalizeMeetingCaptureSession).toHaveBeenCalledWith({
      meetingId: "meeting_123",
      userId: "user_123",
      captureSessionId: "capture_123",
    });
    expect(queueMeetingProcessing).not.toHaveBeenCalled();
  });

  it("surfaces cancel conflicts without masking the cause", async () => {
    vi.mocked(cancelMeetingProcessing).mockRejectedValueOnce(
      new Error("Meeting can no longer be canceled.")
    );

    const response = await cancelMeeting(request({ reason: "user_cancel" }), params());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Meeting can no longer be canceled." });
  });

  it("rejects unsupported integration disconnect providers before auth work", async () => {
    const response = await disconnectIntegration(request({ provider: "slack" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Unsupported provider." });
  });

  it("disconnects the selected integration with a user-scoped upsert", async () => {
    const { integrations } = mockAdmin();

    const response = await disconnectIntegration(request({ provider: "google" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(integrations.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user_123",
        status: "disconnected",
      })
    );
  });
});

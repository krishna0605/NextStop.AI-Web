const getUser = vi.fn();
const exportMeetingToNotion = vi.fn();
const enforceRateLimit = vi.fn();
const recordSecurityAudit = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createClient: async () => ({
    auth: {
      getUser,
    },
  }),
}));

vi.mock("@/lib/notion-workspace", () => ({
  exportMeetingToNotion,
  NotionIntegrationError: class NotionIntegrationError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit,
  recordSecurityAudit,
}));

describe("POST /api/workspace/meetings/[meetingId]/exports/notion", () => {
  beforeEach(() => {
    getUser.mockReset();
    exportMeetingToNotion.mockReset();
    enforceRateLimit.mockReset();
    recordSecurityAudit.mockReset();

    getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
  });

  it("returns a structured 429 payload when notion export is rate limited", async () => {
    const { POST } = await import("@/app/api/workspace/meetings/[meetingId]/exports/notion/route");
    enforceRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 75,
      policyName: "notion_export",
    });

    const response = await POST(new Request("https://nextstop.ai", { method: "POST" }), {
      params: Promise.resolve({ meetingId: "meeting-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.code).toBe("rate_limited");
    expect(payload.policyName).toBe("notion_export");
    expect(exportMeetingToNotion).not.toHaveBeenCalled();
  });

  it("records a security audit event when notion export is requested", async () => {
    const { POST } = await import("@/app/api/workspace/meetings/[meetingId]/exports/notion/route");
    enforceRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: null,
      policyName: "notion_export",
    });
    exportMeetingToNotion.mockResolvedValue({
      pageUrl: "https://notion.so/page-1",
    });

    const response = await POST(new Request("https://nextstop.ai", { method: "POST" }), {
      params: Promise.resolve({ meetingId: "meeting-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(recordSecurityAudit).toHaveBeenCalledWith({
      type: "export_requested",
      policyName: "notion_export",
    });
  });
});

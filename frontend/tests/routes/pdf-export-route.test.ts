const getUser = vi.fn();
const enforceRateLimit = vi.fn();
const recordSecurityAudit = vi.fn();
const from = vi.fn();
const select = vi.fn();
const eq = vi.fn();
const maybeSingle = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createClient: async () => ({
    auth: {
      getUser,
    },
  }),
}));

vi.mock("@/lib/supabase-admin", () => ({
  createAdminClient: () => ({
    from,
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit,
  recordSecurityAudit,
}));

describe("POST /api/workspace/meetings/[meetingId]/exports/pdf", () => {
  beforeEach(() => {
    getUser.mockReset();
    enforceRateLimit.mockReset();
    recordSecurityAudit.mockReset();
    from.mockReset();
    select.mockReset();
    eq.mockReset();
    maybeSingle.mockReset();

    getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    enforceRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 90,
      policyName: "pdf_export",
    });
  });

  it("returns a structured 429 payload before PDF generation work starts", async () => {
    const { POST } = await import("@/app/api/workspace/meetings/[meetingId]/exports/pdf/route");

    const response = await POST(new Request("https://nextstop.ai", { method: "POST" }), {
      params: Promise.resolve({ meetingId: "meeting-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.code).toBe("rate_limited");
    expect(payload.policyName).toBe("pdf_export");
    expect(payload.retryAfterSeconds).toBe(90);
    expect(from).not.toHaveBeenCalled();
    expect(recordSecurityAudit).not.toHaveBeenCalled();
  });
});

import { GET } from "@/app/api/health/readiness/route";

describe("GET /api/health/readiness", () => {
  it("returns 503 with human-readable checks when required envs are missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("NOTION_CLIENT_ID", "");
    vi.stubEnv("NOTION_CLIENT_SECRET", "");
    vi.stubEnv("NOTION_OAUTH_STATE_SECRET", "");
    vi.stubEnv("RAZORPAY_KEY_ID", "");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "");
    vi.stubEnv("RAZORPAY_PLAN_ID", "");
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "");
    vi.stubEnv("TRANSCRIPT_STORAGE_MODE", "disabled");

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Supabase public auth" }),
        expect.objectContaining({ name: "Transcript policy", status: "pass" }),
      ])
    );
  });
});

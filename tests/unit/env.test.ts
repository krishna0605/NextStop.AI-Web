import {
  getAppUrl,
  getMissingEnvSummary,
  getNotionRedirectUri,
  getRuntimeReadiness,
  getTranscriptStorageMode,
  isTranscriptDownloadEnabled,
} from "@/lib/env";

describe("env readiness", () => {
  it("falls back to localhost app url when unset", () => {
    expect(getAppUrl()).toBe("http://localhost:3000");
  });

  it("builds the Notion redirect uri from the app url", () => {
    vi.stubEnv("APP_URL", "https://nextstop.ai");

    expect(getNotionRedirectUri()).toBe("https://nextstop.ai/api/workspace/notion/callback");
  });

  it("defaults transcript storage to disabled in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRANSCRIPT_STORAGE_MODE", "");

    expect(getTranscriptStorageMode()).toBe("disabled");
    expect(isTranscriptDownloadEnabled()).toBe(false);
  });

  it("returns readiness details and missing env summary", () => {
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

    const readiness = getRuntimeReadiness();
    const missing = getMissingEnvSummary();

    expect(readiness.supabaseConfigured).toBe(true);
    expect(readiness.supabaseAdminConfigured).toBe(false);
    expect(readiness.launchSummary.status).toBe("attention_required");
    expect(missing).toContain("APP_URL / NEXT_PUBLIC_APP_URL");
    expect(missing).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(missing).toContain("NOTION_CLIENT_ID / NOTION_CLIENT_SECRET / NOTION_OAUTH_STATE_SECRET");
  });
});

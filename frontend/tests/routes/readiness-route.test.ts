import { GET } from "@/app/api/health/readiness/route";

function stubCompleteServiceEnv(nodeEnv: "development" | "production") {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.stubEnv("APP_URL", "https://nextstop.ai");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://nextstop.ai");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");
  vi.stubEnv("NOTION_CLIENT_ID", "notion-client-id");
  vi.stubEnv("NOTION_CLIENT_SECRET", "notion-client-secret");
  vi.stubEnv("NOTION_OAUTH_STATE_SECRET", "notion-state-secret");
  vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_key");
  vi.stubEnv("RAZORPAY_KEY_SECRET", "rzp_secret");
  vi.stubEnv("RAZORPAY_PLAN_ID", "plan_test");
  vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "webhook_secret");
  vi.stubEnv("TRANSCRIPT_STORAGE_MODE", "disabled");
  vi.stubEnv("AI_CORE_API_URL", "https://ai-core.example.com");
  vi.stubEnv("AI_CORE_SHARED_SECRET", "shared-secret");
  vi.stubEnv("AI_PIPELINE_MODE", "railway_remote");
}

function stubAiCoreHealth(payload: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(payload))
  );
}

const healthyWorkerPayload = {
  workerReady: true,
  directExecution: true,
  workerStale: false,
};

describe("GET /api/health/readiness", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

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
    expect(payload.launchDecision).toBe("blocked");
    expect(Array.isArray(payload.blockingFailures)).toBe(true);
    expect(Array.isArray(payload.warnings)).toBe(true);
    expect(payload.hostedVerification).toBeNull();
    expect(payload.launchCertification).toBeNull();
  });

  it("blocks production readiness when launch evidence is missing", async () => {
    stubCompleteServiceEnv("production");
    stubAiCoreHealth({
      ...healthyWorkerPayload,
      hostedVerification: {
        lastHostedVerificationStatus: "unknown",
      },
      launchCertification: {
        lastLaunchCertificationStatus: "pending",
        validationGreen: false,
        hostedVerificationPassed: false,
        operationalProofComplete: false,
      },
      observability: {
        environment: "development",
        sentryConfigured: false,
        otlpConfigured: false,
      },
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.launchDecision).toBe("blocked");
    expect(payload.blockingFailures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Hosted verification" }),
        expect.objectContaining({ name: "Launch certification" }),
        expect.objectContaining({ name: "Production observability" }),
      ])
    );
    expect(payload.productionEvidenceChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Hosted verification", status: "fail" }),
        expect.objectContaining({ name: "Launch certification", status: "fail" }),
        expect.objectContaining({ name: "Production observability", status: "fail" }),
      ])
    );
  });

  it("allows production readiness when service checks and launch evidence pass", async () => {
    stubCompleteServiceEnv("production");
    stubAiCoreHealth({
      ...healthyWorkerPayload,
      hostedVerification: {
        lastHostedVerificationStatus: "pass",
      },
      launchCertification: {
        lastLaunchCertificationStatus: "certified",
        validationGreen: true,
        hostedVerificationPassed: true,
        operationalProofComplete: true,
      },
      observability: {
        environment: "production",
        sentryConfigured: true,
        otlpConfigured: true,
      },
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.launchDecision).toBe("ready");
    expect(payload.blockingFailures).toEqual([]);
    expect(payload.productionEvidenceChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Hosted verification", status: "pass" }),
        expect.objectContaining({ name: "Launch certification", status: "pass" }),
        expect.objectContaining({ name: "Production observability", status: "pass" }),
      ])
    );
  });

  it("does not require launch evidence outside production", async () => {
    stubCompleteServiceEnv("development");
    stubAiCoreHealth({
      ...healthyWorkerPayload,
      hostedVerification: {
        lastHostedVerificationStatus: "unknown",
      },
      launchCertification: {
        lastLaunchCertificationStatus: "pending",
        validationGreen: false,
        hostedVerificationPassed: false,
        operationalProofComplete: false,
      },
      observability: {
        environment: "development",
        sentryConfigured: false,
        otlpConfigured: false,
      },
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.launchDecision).toBe("ready");
    expect(payload.productionEvidenceChecks).toEqual([]);
  });
});

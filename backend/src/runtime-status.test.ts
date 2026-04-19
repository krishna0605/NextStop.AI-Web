import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redisStore = new Map<string, string>();

vi.mock("ioredis", () => {
  class MockRedis {
    async set(key: string, value: string) {
      redisStore.set(key, value);
      return "OK";
    }

    async get(key: string) {
      return redisStore.get(key) ?? null;
    }
  }

  return {
    Redis: MockRedis,
  };
});

describe("runtime status", () => {
  beforeEach(() => {
    redisStore.clear();
    vi.resetModules();
    process.env.REDIS_URL = "redis://127.0.0.1:6379";
    process.env.RELEASE_VERSION = "test-release";
  });

  afterEach(() => {
    delete process.env.RELEASE_VERSION;
  });

  it("publishes shared worker readiness and degraded metadata", async () => {
    const runtimeStatus = await import("./runtime-status.js");

    runtimeStatus.markWorkerReady();
    runtimeStatus.markWorkerActivity("analyze", "job-123");
    runtimeStatus.markWorkerDegraded("openai timed out", "analyze", "job-123");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const status = await runtimeStatus.loadWorkerStatus();

    expect(status.workerReady).toBe(true);
    expect(status.lastProcessedJobId).toBe("job-123");
    expect(status.lastProcessedJobName).toBe("analyze");
    expect(status.degradedReason).toBe("openai timed out");
    expect(status.workerVersion).toBe("test-release");
    expect(status.stale).toBe(false);
  });

  it("tracks cleanup runs, success counters, and failures", async () => {
    const runtimeStatus = await import("./runtime-status.js");

    runtimeStatus.recordCleanupRun(4);
    runtimeStatus.recordCleanupSuccess({
      pendingExpiredAssetCount: 2,
      deletedAudioAssetCount: 3,
      deletedTranscriptAssetCount: 1,
    });
    runtimeStatus.recordCleanupFailure("storage delete failed", 1);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const cleanup = await runtimeStatus.loadCleanupStatus();

    expect(cleanup.pendingExpiredAssetCount).toBe(1);
    expect(cleanup.deletedAudioAssetCount).toBe(3);
    expect(cleanup.deletedTranscriptAssetCount).toBe(1);
    expect(cleanup.lastCleanupSuccessAt).not.toBeNull();
    expect(cleanup.lastCleanupError).toBe("storage delete failed");
  });

  it("returns a default security status snapshot when no security events are recorded", async () => {
    const runtimeStatus = await import("./runtime-status.js");

    const security = await runtimeStatus.loadSecurityStatus();

    expect(security.rateLimitDeniedCount).toBe(0);
    expect(security.transcriptDownloadGrantedCount).toBe(0);
    expect(security.denialByPolicy).toEqual({});
  });

  it("persists hosted verification and launch certification summaries", async () => {
    const runtimeStatus = await import("./runtime-status.js");

    runtimeStatus.recordHostedVerification({
      status: "partial",
      scenario: "refresh_during_finalizing",
      failureReason: "Manual durable-flow scenarios still pending.",
      source: "workflow",
      scenarios: {
        readiness_api: {
          status: "pass",
          detail: "Readiness returned ready.",
          checkedAt: "2026-04-19T12:00:00.000Z",
        },
      },
      lastHostedVerificationAt: "2026-04-19T12:00:00.000Z",
    });
    runtimeStatus.recordLaunchCertification({
      status: "pending",
      certifiedBy: "qa@example.com",
      certificationNotes: "Waiting on full hosted durable-flow signoff.",
      validationGreen: true,
      hostedVerificationPassed: false,
      operationalProofComplete: false,
      readinessLaunchDecision: "degraded",
      lastLaunchCertificationAt: "2026-04-19T12:05:00.000Z",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const hostedVerification = await runtimeStatus.loadHostedVerificationStatus();
    const launchCertification = await runtimeStatus.loadLaunchCertificationStatus();

    expect(hostedVerification.lastHostedVerificationStatus).toBe("partial");
    expect(hostedVerification.lastHostedVerificationScenario).toBe("refresh_during_finalizing");
    expect(hostedVerification.scenarios.readiness_api?.status).toBe("pass");
    expect(launchCertification.lastLaunchCertificationStatus).toBe("pending");
    expect(launchCertification.certifiedBy).toBe("qa@example.com");
    expect(launchCertification.validationGreen).toBe(true);
  });
});

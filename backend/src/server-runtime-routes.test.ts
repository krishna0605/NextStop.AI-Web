import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redisStore = new Map<string, string>();
let redisGetShouldFail = false;
let redisSetShouldFail = false;

const queueMocks = vi.hoisted(() => ({
  add: vi.fn(),
  getJob: vi.fn(),
  getJobCounts: vi.fn(async () => ({
    waiting: 2,
    active: 1,
    completed: 3,
    failed: 0,
    delayed: 0,
    paused: 0,
  })),
  removeQueuedAiJob: vi.fn(async () => ({ removed: true, missing: false })),
}));

const supabaseMocks = vi.hoisted(() => ({
  admin: {
    from: vi.fn(),
  },
  requireUserFromAuthHeader: vi.fn(),
  resolveBillingSnapshot: vi.fn(),
  buildEntitlements: vi.fn(),
  getDisplayName: vi.fn(),
}));

vi.mock("ioredis", () => {
  class MockRedis {
    async set(key: string, value: string) {
      if (redisSetShouldFail) {
        throw new Error("Redis set unavailable");
      }
      redisStore.set(key, value);
      return "OK";
    }

    async get(key: string) {
      if (redisGetShouldFail) {
        throw new Error("Redis get unavailable");
      }
      return redisStore.get(key) ?? null;
    }
  }

  return {
    Redis: MockRedis,
  };
});

vi.mock("./queue.js", () => ({
  getAiQueue: () => ({
    add: queueMocks.add,
    getJob: queueMocks.getJob,
    getJobCounts: queueMocks.getJobCounts,
  }),
  removeQueuedAiJob: queueMocks.removeQueuedAiJob,
}));

vi.mock("./supabase.js", () => ({
  buildEntitlements: supabaseMocks.buildEntitlements,
  createAdminClient: () => supabaseMocks.admin,
  getDisplayName: supabaseMocks.getDisplayName,
  requireUserFromAuthHeader: supabaseMocks.requireUserFromAuthHeader,
  resolveBillingSnapshot: supabaseMocks.resolveBillingSnapshot,
}));

function makeSupabaseQuery({
  data = [],
  count = 0,
  singleData,
  maybeSingleData,
  error = null,
}: {
  data?: unknown;
  count?: number;
  singleData?: unknown;
  maybeSingleData?: unknown;
  error?: unknown;
} = {}) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    insert: vi.fn(() => query),
    upsert: vi.fn(() => query),
    update: vi.fn(() => query),
    single: vi.fn(async () => ({ data: singleData ?? data, error })),
    maybeSingle: vi.fn(async () => ({
      data: typeof maybeSingleData === "undefined" ? data : maybeSingleData,
      error,
    })),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data, count, error }).then(resolve, reject),
  };

  return query;
}

function installDefaultSupabaseMocks() {
  supabaseMocks.requireUserFromAuthHeader.mockImplementation(async (authHeader?: string) => {
    if (authHeader !== "Bearer user-token") {
      throw new Error("Unauthorized");
    }

    return {
      token: "user-token",
      user: {
        id: "user_123",
        email: "user@example.com",
      },
    };
  });
  supabaseMocks.resolveBillingSnapshot.mockResolvedValue({
    profile: {
      id: "user_123",
      full_name: "Ada Lovelace",
    },
    subscription: null,
    planCode: "pro_monthly",
    accessState: "active",
    currentPeriodEnd: "2026-05-28T10:00:00.000Z",
  });
  supabaseMocks.buildEntitlements.mockReturnValue({
    plan_code: "pro_monthly",
    access_state: "active",
    features: {
      ai_analysis: { allowed: true },
    },
  });
  supabaseMocks.getDisplayName.mockReturnValue("Ada Lovelace");
  supabaseMocks.admin.from.mockImplementation((table: string) => {
    switch (table) {
      case "web_meetings":
        return makeSupabaseQuery({
          data: [
            {
              id: "meeting_123",
              title: "Release Readiness",
              source_type: "desktop",
              status: "ready",
            },
          ],
          count: 1,
          singleData: {
            id: "meeting_123",
            title: "Release Readiness",
            source_type: "desktop",
          },
          maybeSingleData: {
            id: "meeting_123",
            title: "Release Readiness",
            source_type: "desktop",
          },
        });
      case "desktop_devices":
        return makeSupabaseQuery({
          data: [
            {
              device_id: "device_123",
              platform: "windows",
            },
          ],
          singleData: {
            device_id: "device_123",
            platform: "windows",
          },
        });
      case "meeting_findings":
      case "meeting_artifacts":
      case "meeting_exports":
      case "ai_jobs":
        return makeSupabaseQuery({ data: [], count: 0 });
      default:
        return makeSupabaseQuery({ data: [], count: 0 });
    }
  });
}

describe("AI core runtime routes", () => {
  let app: FastifyInstance | null = null;

  beforeEach(async () => {
    redisStore.clear();
    redisGetShouldFail = false;
    redisSetShouldFail = false;
    vi.resetModules();
    vi.clearAllMocks();
    installDefaultSupabaseMocks();
    process.env.AI_CORE_SHARED_SECRET = "test-shared-secret";
    process.env.REDIS_URL = "redis://127.0.0.1:6379";

    const server = await import("./server.js");
    app = server.app;
    await app.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    app = null;
    delete process.env.AI_CORE_SHARED_SECRET;
    delete process.env.REDIS_URL;
  });

  it("exposes runtime health without requiring external Redis or queue listeners", async () => {
    const response = await app!.inject({
      method: "GET",
      url: "/health",
    });
    const health = response.json();

    expect(response.statusCode).toBe(200);
    expect(health).toEqual(
      expect.objectContaining({
        ok: true,
        service: "nextstop-ai-core",
        queue: "nextstop-ai-jobs",
        observability: expect.objectContaining({
          service: "nextstop-ai-core-api",
        }),
      })
    );
    expect(health.hostedVerification).toBeDefined();
    expect(health.launchCertification).toBeDefined();
  });

  it("rejects unauthenticated job enqueue requests", async () => {
    const response = await app!.inject({
      method: "POST",
      url: "/jobs/transcribe",
      payload: {
        jobId: "job_1",
        meetingId: "meeting_1",
        userId: "user_1",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Unauthorized" });
    expect(queueMocks.add).not.toHaveBeenCalled();
  });

  it("rejects malformed analyze payloads before enqueueing work", async () => {
    const response = await app!.inject({
      method: "POST",
      url: "/jobs/analyze",
      headers: {
        authorization: "Bearer test-shared-secret",
      },
      payload: {
        jobId: "job_1",
        userId: "user_1",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "jobId, meetingId, and userId are required.",
    });
    expect(queueMocks.add).not.toHaveBeenCalled();
  });

  it("enqueues transcription jobs with the caller-provided job id", async () => {
    const response = await app!.inject({
      method: "POST",
      url: "/jobs/transcribe",
      headers: {
        authorization: "Bearer test-shared-secret",
      },
      payload: {
        jobId: "job_123",
        meetingId: "meeting_123",
        userId: "user_123",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      enqueued: "transcribe",
      jobId: "job_123",
    });
    expect(queueMocks.add).toHaveBeenCalledWith(
      "transcribe",
      {
        jobId: "job_123",
        meetingId: "meeting_123",
        userId: "user_123",
      },
      expect.objectContaining({
        jobId: "job_123",
        removeOnComplete: false,
        removeOnFail: false,
      })
    );
  });

  it("cancels queued AI jobs through the queue adapter", async () => {
    const response = await app!.inject({
      method: "POST",
      url: "/jobs/cancel",
      headers: {
        authorization: "Bearer test-shared-secret",
      },
      payload: {
        jobId: "job_cancel",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      jobId: "job_cancel",
      removed: true,
      missing: false,
    });
    expect(queueMocks.removeQueuedAiJob).toHaveBeenCalledWith("job_cancel");
  });

  it("exposes metrics with queue and runtime gauges", async () => {
    const response = await app!.inject({
      method: "GET",
      url: "/metrics",
    });
    const body = response.body;

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(body).toContain("nextstop_queue_depth");
    expect(body).toContain("nextstop_api_worker_ready");
    expect(queueMocks.getJobCounts).toHaveBeenCalledWith(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed",
      "paused"
    );
  });

  it("falls back to local runtime state when Redis reads fail", async () => {
    redisGetShouldFail = true;

    const response = await app!.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        ok: true,
        workerReady: false,
        workerStale: false,
      })
    );
  });

  it("reports stale degraded worker state from runtime storage", async () => {
    redisStore.set(
      "nextstop:runtime:worker",
      JSON.stringify({
        workerReady: true,
        lastHeartbeatAt: "2026-04-28T00:00:00.000Z",
        lastProcessedJobId: "job_old",
        lastProcessedJobName: "transcribe",
        executionMode: "railway_worker_direct",
        workerVersion: "worker-old",
        degradedReason: "model_unavailable",
        directExecution: true,
      })
    );

    const response = await app!.inject({
      method: "GET",
      url: "/health",
    });
    const health = response.json();

    expect(response.statusCode).toBe(200);
    expect(health).toEqual(
      expect.objectContaining({
        workerReady: true,
        workerStale: true,
        degradedReason: "model_unavailable",
        lastAiJobId: "job_old",
        lastJobName: "transcribe",
        workerVersion: "worker-old",
      })
    );
  });

  it("returns a safe error when queue enqueue fails", async () => {
    queueMocks.add.mockRejectedValueOnce(new Error("queue unavailable"));

    const response = await app!.inject({
      method: "POST",
      url: "/jobs/transcribe",
      headers: {
        authorization: "Bearer test-shared-secret",
      },
      payload: {
        jobId: "job_fail",
        meetingId: "meeting_fail",
        userId: "user_fail",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "queue unavailable" });
  });

  it("inspects missing jobs without throwing", async () => {
    queueMocks.getJob.mockResolvedValueOnce(null);

    const response = await app!.inject({
      method: "GET",
      url: "/jobs/job_missing",
      headers: {
        authorization: "Bearer test-shared-secret",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: "job_missing",
      name: null,
      state: "missing",
      attemptsMade: 0,
    });
  });

  it("retries failed jobs and leaves non-failed jobs untouched", async () => {
    const retry = vi.fn(async () => undefined);
    queueMocks.getJob.mockResolvedValueOnce({
      id: "job_retry",
      name: "transcribe",
      attemptsMade: 2,
      getState: vi.fn(async () => "failed"),
      retry,
    });

    const response = await app!.inject({
      method: "POST",
      url: "/jobs/job_retry/retry",
      headers: {
        authorization: "Bearer test-shared-secret",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      retried: true,
      jobId: "job_retry",
    });
    expect(retry).toHaveBeenCalled();
  });

  it("requires auth for desktop bootstrap", async () => {
    const response = await app!.inject({
      method: "GET",
      url: "/v1/desktop/bootstrap",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns desktop bootstrap payload for authenticated desktop clients", async () => {
    const response = await app!.inject({
      method: "GET",
      url: "/v1/desktop/bootstrap",
      headers: {
        authorization: "Bearer user-token",
      },
    });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({
          id: "user_123",
          display_name: "Ada Lovelace",
        }),
        entitlements: expect.objectContaining({
          plan_code: "pro_monthly",
        }),
        recent_meetings: expect.arrayContaining([
          expect.objectContaining({ id: "meeting_123" }),
        ]),
      })
    );
  });

  it("validates desktop device registration payloads", async () => {
    const response = await app!.inject({
      method: "POST",
      url: "/v1/desktop/devices/register",
      headers: {
        authorization: "Bearer user-token",
      },
      payload: {
        deviceId: "device_123",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "deviceId and platform are required." });
  });

  it("syncs desktop meeting outputs only for user-owned meetings", async () => {
    const response = await app!.inject({
      method: "POST",
      url: "/v1/desktop/meetings/meeting_123/outputs",
      headers: {
        authorization: "Bearer user-token",
      },
      payload: {
        findings: {
          summaryShort: "Ready",
          actionItems: ["Ship"],
        },
        artifacts: {
          canonicalMarkdown: "# Release Readiness",
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        ok: true,
        meetingId: "meeting_123",
        findingsSynced: true,
        artifactsSynced: 5,
      })
    );
  });
});

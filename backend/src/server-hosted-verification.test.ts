import type { FastifyInstance } from "fastify";
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

vi.mock("./queue.js", () => {
  const queue = {
    add: vi.fn(),
    getJob: vi.fn(),
    getJobCounts: vi.fn(async () => ({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    })),
  };

  return {
    getAiQueue: () => queue,
    removeQueuedAiJob: vi.fn(async () => ({ removed: false, missing: true })),
  };
});

describe("hosted verification runtime publish route", () => {
  let app: FastifyInstance | null = null;

  beforeEach(async () => {
    redisStore.clear();
    vi.resetModules();
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

  it("publishes hosted verification and exposes it from health", async () => {
    const publishResponse = await app!.inject({
      method: "POST",
      url: "/runtime/hosted-verification",
      headers: {
        authorization: "Bearer test-shared-secret",
      },
      payload: {
        status: "pass",
        scenario: null,
        failureReason: null,
        source: "post_deploy_workflow",
        lastHostedVerificationAt: "2026-04-28T10:00:00.000Z",
        scenarios: {
          readiness_api: {
            status: "pass",
            detail: "Readiness route and readiness script passed.",
            checkedAt: "2026-04-28T10:00:00.000Z",
          },
        },
      },
    });

    expect(publishResponse.statusCode).toBe(200);
    expect(publishResponse.json()).toEqual(
      expect.objectContaining({
        ok: true,
        hostedVerification: expect.objectContaining({
          status: "pass",
          source: "post_deploy_workflow",
        }),
      })
    );

    const healthResponse = await app!.inject({
      method: "GET",
      url: "/health",
    });
    const health = healthResponse.json();

    expect(healthResponse.statusCode).toBe(200);
    expect(health.hostedVerification).toEqual(
      expect.objectContaining({
        lastHostedVerificationStatus: "pass",
        lastHostedVerificationAt: "2026-04-28T10:00:00.000Z",
        source: "post_deploy_workflow",
        scenarios: expect.objectContaining({
          readiness_api: expect.objectContaining({
            status: "pass",
          }),
        }),
      })
    );
  });

  it("rejects hosted verification publishes without the shared secret", async () => {
    const response = await app!.inject({
      method: "POST",
      url: "/runtime/hosted-verification",
      payload: {
        status: "pass",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Unauthorized" });
  });

  it("rejects hosted verification payloads with invalid statuses", async () => {
    const response = await app!.inject({
      method: "POST",
      url: "/runtime/hosted-verification",
      headers: {
        authorization: "Bearer test-shared-secret",
      },
      payload: {
        status: "certified",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "status must be one of unknown, pass, fail, blocked, or partial.",
    });
  });

  it("rejects hosted verification scenarios with invalid statuses", async () => {
    const response = await app!.inject({
      method: "POST",
      url: "/runtime/hosted-verification",
      headers: {
        authorization: "Bearer test-shared-secret",
      },
      payload: {
        status: "partial",
        scenarios: {
          deployed_smoke: {
            status: "certified",
          },
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "Scenario deployed_smoke has an invalid status.",
    });
  });
});

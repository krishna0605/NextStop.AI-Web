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

describe("launch certification runtime publish route", () => {
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

  it("publishes blocked launch certification and exposes it from health", async () => {
    const publishResponse = await app!.inject({
      method: "POST",
      url: "/runtime/launch-certification",
      headers: {
        authorization: "Bearer test-shared-secret",
      },
      payload: {
        status: "blocked",
        certifiedBy: "release-owner",
        certificationNotes: "Waiting on production observability proof.",
        validationGreen: true,
        hostedVerificationPassed: true,
        operationalProofComplete: false,
        readinessLaunchDecision: "blocked",
        lastLaunchCertificationAt: "2026-04-28T11:00:00.000Z",
      },
    });

    expect(publishResponse.statusCode).toBe(200);
    expect(publishResponse.json()).toEqual(
      expect.objectContaining({
        ok: true,
        launchCertification: expect.objectContaining({
          status: "blocked",
          operationalProofComplete: false,
        }),
      })
    );

    const healthResponse = await app!.inject({
      method: "GET",
      url: "/health",
    });
    const health = healthResponse.json();

    expect(healthResponse.statusCode).toBe(200);
    expect(health.launchCertification).toEqual(
      expect.objectContaining({
        lastLaunchCertificationStatus: "blocked",
        lastLaunchCertificationAt: "2026-04-28T11:00:00.000Z",
        certifiedBy: "release-owner",
        validationGreen: true,
        hostedVerificationPassed: true,
        operationalProofComplete: false,
        readinessLaunchDecision: "blocked",
      })
    );
  });

  it("publishes pending launch certification for audit visibility", async () => {
    const publishResponse = await app!.inject({
      method: "POST",
      url: "/runtime/launch-certification",
      headers: {
        authorization: "Bearer test-shared-secret",
      },
      payload: {
        status: "pending",
        certifiedBy: "release-owner",
        certificationNotes: "Certification is waiting on final manual approval.",
        validationGreen: false,
        hostedVerificationPassed: true,
        operationalProofComplete: false,
        readinessLaunchDecision: "blocked",
        lastLaunchCertificationAt: "2026-04-28T11:30:00.000Z",
      },
    });

    expect(publishResponse.statusCode).toBe(200);

    const healthResponse = await app!.inject({
      method: "GET",
      url: "/health",
    });
    const health = healthResponse.json();

    expect(health.launchCertification).toEqual(
      expect.objectContaining({
        lastLaunchCertificationStatus: "pending",
        lastLaunchCertificationAt: "2026-04-28T11:30:00.000Z",
        validationGreen: false,
        hostedVerificationPassed: true,
        operationalProofComplete: false,
      })
    );
  });

  it("publishes certified launch certification only when all proof flags are true", async () => {
    const response = await app!.inject({
      method: "POST",
      url: "/runtime/launch-certification",
      headers: {
        authorization: "Bearer test-shared-secret",
      },
      payload: {
        status: "certified",
        certifiedBy: "release-owner",
        certificationNotes: "All production launch gates passed.",
        validationGreen: true,
        hostedVerificationPassed: true,
        operationalProofComplete: true,
        readinessLaunchDecision: "ready",
        lastLaunchCertificationAt: "2026-04-28T12:00:00.000Z",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        ok: true,
        launchCertification: expect.objectContaining({
          status: "certified",
          validationGreen: true,
          hostedVerificationPassed: true,
          operationalProofComplete: true,
        }),
      })
    );
  });

  it("rejects launch certification publishes without the shared secret", async () => {
    const response = await app!.inject({
      method: "POST",
      url: "/runtime/launch-certification",
      payload: {
        status: "pending",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Unauthorized" });
  });

  it("rejects launch certification payloads with invalid statuses", async () => {
    const response = await app!.inject({
      method: "POST",
      url: "/runtime/launch-certification",
      headers: {
        authorization: "Bearer test-shared-secret",
      },
      payload: {
        status: "pass",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "status must be one of pending, certified, or blocked.",
    });
  });

  it("rejects certified launch certification when any proof flag is missing", async () => {
    const response = await app!.inject({
      method: "POST",
      url: "/runtime/launch-certification",
      headers: {
        authorization: "Bearer test-shared-secret",
      },
      payload: {
        status: "certified",
        validationGreen: true,
        hostedVerificationPassed: true,
        operationalProofComplete: false,
        readinessLaunchDecision: "ready",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error:
        "Certified launch status requires validationGreen, hostedVerificationPassed, and operationalProofComplete.",
    });
  });

  it("rejects launch certification payloads with invalid readiness decisions", async () => {
    const response = await app!.inject({
      method: "POST",
      url: "/runtime/launch-certification",
      headers: {
        authorization: "Bearer test-shared-secret",
      },
      payload: {
        status: "pending",
        readinessLaunchDecision: "unknown",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "readinessLaunchDecision must be ready, degraded, or blocked.",
    });
  });

  it("rejects launch certification payloads with malformed timestamps", async () => {
    const response = await app!.inject({
      method: "POST",
      url: "/runtime/launch-certification",
      headers: {
        authorization: "Bearer test-shared-secret",
      },
      payload: {
        status: "pending",
        lastLaunchCertificationAt: "not-a-date",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "lastLaunchCertificationAt must be a valid ISO timestamp.",
    });
  });
});

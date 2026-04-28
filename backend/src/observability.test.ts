import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getObservabilityStatus } from "./observability.js";

const managedEnvKeys = [
  "NODE_ENV",
  "SENTRY_DSN",
  "SENTRY_ENVIRONMENT",
  "SENTRY_RELEASE",
  "RELEASE_VERSION",
  "RAILWAY_GIT_COMMIT_SHA",
  "VERCEL_GIT_COMMIT_SHA",
  "OTEL_SERVICE_NAME",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
];

const originalEnv = new Map<string, string | undefined>();

describe("observability status", () => {
  beforeEach(() => {
    for (const key of managedEnvKeys) {
      originalEnv.set(key, process.env[key]);
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of managedEnvKeys) {
      const value = originalEnv.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    originalEnv.clear();
  });

  it("reports a non-production unconfigured status when telemetry env is missing", () => {
    const status = getObservabilityStatus();

    expect(status).toEqual({
      service: "nextstop-ai-core-api",
      environment: "development",
      release: "dev",
      sentryConfigured: false,
      otlpConfigured: false,
    });
  });

  it("reports production-ready observability when Sentry and OTLP env are configured", () => {
    process.env.NODE_ENV = "production";
    process.env.SENTRY_ENVIRONMENT = "production";
    process.env.SENTRY_DSN = "https://public-key@sentry.example.com/123";
    process.env.OTEL_SERVICE_NAME = "nextstop-ai-core-api";
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "https://otel.example.com/v1/traces";

    const status = getObservabilityStatus();

    expect(status).toEqual({
      service: "nextstop-ai-core-api",
      environment: "production",
      release: "dev",
      sentryConfigured: true,
      otlpConfigured: true,
    });
  });

  it("surfaces release metadata without exposing telemetry secrets", () => {
    process.env.NODE_ENV = "production";
    process.env.SENTRY_ENVIRONMENT = "production";
    process.env.SENTRY_DSN = "https://public-key@sentry.example.com/123";
    process.env.SENTRY_RELEASE = "web-2026.04.28-abcdef";
    process.env.RELEASE_VERSION = "fallback-release";
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "https://otel.example.com/v1/traces";

    const status = getObservabilityStatus("nextstop-ai-core-worker");

    expect(status.service).toBe("nextstop-ai-core-worker");
    expect(status.release).toBe("web-2026.04.28-abcdef");
    expect(status).not.toHaveProperty("sentryDsn");
    expect(status).not.toHaveProperty("otlpEndpoint");
  });
});

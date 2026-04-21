import process from "node:process";

import * as Sentry from "@sentry/node";
import {
  SpanStatusCode,
  trace,
  type Attributes,
  type Span,
  type SpanAttributeValue,
} from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from "prom-client";

type LogLevel = "info" | "warn" | "error";

type HttpMetricLabels = {
  method: string;
  route: string;
  status_code: string;
};

type AiJobMetricLabels = {
  job_name: string;
  outcome: "success" | "failed" | "canceled";
};

type AiProviderMetricLabels = {
  provider: string;
  operation: string;
  outcome: "success" | "failed" | "fallback";
};

type RuntimeGaugeSnapshot = {
  workerReady: boolean;
  workerStale: boolean;
  directExecution: boolean;
  heartbeatAgeSeconds: number;
  cleanupDeletedAudioAssets: number;
  cleanupDeletedTranscriptAssets: number;
  cleanupPendingExpiredAssets: number;
  cleanupFailures: number;
  securityRateLimitDeniedCount: number;
  securityTranscriptGrantedCount: number;
  securityTranscriptBlockedCount: number;
  securityExportRequestedCount: number;
  hostedVerificationPassed: boolean;
  launchCertified: boolean;
  queueDepthByState: Record<string, number>;
  meetingCountByStatus: Record<string, number>;
  cancelRequestedJobs: number;
};

const registry = new Registry();
collectDefaultMetrics({
  register: registry,
  prefix: "nextstop_runtime_",
});

const httpRequestsTotal = new Counter<keyof HttpMetricLabels>({
  name: "nextstop_http_requests_total",
  help: "Total HTTP requests handled by the backend API.",
  registers: [registry],
  labelNames: ["method", "route", "status_code"],
});

const httpRequestDurationSeconds = new Histogram<keyof HttpMetricLabels>({
  name: "nextstop_http_request_duration_seconds",
  help: "HTTP request duration in seconds by route, method, and status.",
  registers: [registry],
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
});

const aiJobsTotal = new Counter<keyof AiJobMetricLabels>({
  name: "nextstop_ai_jobs_total",
  help: "AI job outcomes observed by the worker.",
  registers: [registry],
  labelNames: ["job_name", "outcome"],
});

const aiJobDurationSeconds = new Histogram<"job_name" | "outcome">({
  name: "nextstop_ai_job_duration_seconds",
  help: "AI job duration in seconds by job type and outcome.",
  registers: [registry],
  labelNames: ["job_name", "outcome"],
  buckets: [0.1, 0.5, 1, 2, 5, 15, 30, 60, 120],
});

const aiProviderCallsTotal = new Counter<keyof AiProviderMetricLabels>({
  name: "nextstop_ai_provider_calls_total",
  help: "AI provider calls by provider, operation, and outcome.",
  registers: [registry],
  labelNames: ["provider", "operation", "outcome"],
});

const aiProviderDurationSeconds = new Histogram<keyof AiProviderMetricLabels>({
  name: "nextstop_ai_provider_duration_seconds",
  help: "AI provider call duration in seconds by provider, operation, and outcome.",
  registers: [registry],
  labelNames: ["provider", "operation", "outcome"],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 40],
});

const workerReadyGauge = new Gauge({
  name: "nextstop_api_worker_ready",
  help: "Whether the backend has observed a healthy worker.",
  registers: [registry],
});

const workerStaleGauge = new Gauge({
  name: "nextstop_api_worker_stale",
  help: "Whether the worker heartbeat is stale.",
  registers: [registry],
});

const directExecutionGauge = new Gauge({
  name: "nextstop_api_direct_execution",
  help: "Whether direct execution mode is enabled for the backend worker.",
  registers: [registry],
});

const workerHeartbeatAgeGauge = new Gauge({
  name: "nextstop_api_worker_heartbeat_age_seconds",
  help: "Age of the latest worker heartbeat in seconds.",
  registers: [registry],
});

const cleanupDeletedAudioGauge = new Gauge({
  name: "nextstop_cleanup_deleted_audio_assets_total",
  help: "Total raw audio assets deleted by cleanup.",
  registers: [registry],
});

const cleanupDeletedTranscriptGauge = new Gauge({
  name: "nextstop_cleanup_deleted_transcript_assets_total",
  help: "Total transcript assets deleted by cleanup.",
  registers: [registry],
});

const cleanupPendingExpiredAssetsGauge = new Gauge({
  name: "nextstop_cleanup_pending_expired_assets",
  help: "Expired assets still pending cleanup.",
  registers: [registry],
});

const cleanupFailuresGauge = new Gauge({
  name: "nextstop_cleanup_failure_state",
  help: "Whether cleanup is currently reporting an error.",
  registers: [registry],
});

const securityRateLimitDeniedGauge = new Gauge({
  name: "nextstop_security_rate_limit_denied_total",
  help: "Total requests denied by rate limiting.",
  registers: [registry],
});

const securityTranscriptGrantedGauge = new Gauge({
  name: "nextstop_security_transcript_download_granted_total",
  help: "Total allowed transcript downloads.",
  registers: [registry],
});

const securityTranscriptBlockedGauge = new Gauge({
  name: "nextstop_security_transcript_download_blocked_total",
  help: "Total blocked transcript downloads.",
  registers: [registry],
});

const securityExportRequestedGauge = new Gauge({
  name: "nextstop_security_export_requested_total",
  help: "Total export requests observed by backend routes.",
  registers: [registry],
});

const hostedVerificationPassedGauge = new Gauge({
  name: "nextstop_hosted_verification_passed",
  help: "Whether the latest hosted verification run passed.",
  registers: [registry],
});

const launchCertifiedGauge = new Gauge({
  name: "nextstop_launch_certified",
  help: "Whether the latest launch certification is active.",
  registers: [registry],
});

const queueDepthGauge = new Gauge({
  name: "nextstop_queue_depth",
  help: "Queue depth by BullMQ state.",
  registers: [registry],
  labelNames: ["state"],
});

const meetingStatusGauge = new Gauge({
  name: "nextstop_meetings_by_status",
  help: "Meeting counts by high-level lifecycle status.",
  registers: [registry],
  labelNames: ["status"],
});

const cancelRequestedJobsGauge = new Gauge({
  name: "nextstop_cancel_requested_jobs",
  help: "Queued or running AI jobs with cancel requested.",
  registers: [registry],
});

let telemetryBootstrapped = false;
let sentryBootstrapped = false;
let otelBootstrapped = false;
let otelSdk: NodeSDK | null = null;

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function getEnvironment() {
  return readEnv("SENTRY_ENVIRONMENT") ?? process.env.NODE_ENV ?? "development";
}

function getReleaseVersion() {
  return (
    readEnv("SENTRY_RELEASE") ??
    readEnv("RELEASE_VERSION") ??
    readEnv("RAILWAY_GIT_COMMIT_SHA") ??
    readEnv("VERCEL_GIT_COMMIT_SHA") ??
    "dev"
  );
}

function getTelemetryServiceName(serviceName?: string) {
  return serviceName ?? readEnv("OTEL_SERVICE_NAME") ?? "nextstop-ai-core-api";
}

function toSpanAttributes(attributes?: Record<string, unknown>): Attributes {
  const normalized: Attributes = {};

  for (const [key, value] of Object.entries(attributes ?? {})) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      normalized[key] = value satisfies SpanAttributeValue;
      continue;
    }

    if (Array.isArray(value)) {
      if (value.every((item) => typeof item === "string")) {
        normalized[key] = value;
        continue;
      }

      if (value.every((item) => typeof item === "number")) {
        normalized[key] = value;
        continue;
      }

      if (value.every((item) => typeof item === "boolean")) {
        normalized[key] = value;
      }
    }
  }

  return normalized;
}

function normalizeRouteLabel(route: string) {
  return route.replace(/\?.*$/, "") || "unknown";
}

function getHistogramDurationSeconds(startedAt: number) {
  return Math.max(0, (Date.now() - startedAt) / 1000);
}

function getNumericEnv(name: string, fallback: number) {
  const parsed = Number(readEnv(name));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function bootstrapSentry() {
  if (sentryBootstrapped) {
    return;
  }

  const dsn = readEnv("SENTRY_DSN");

  if (!dsn) {
    sentryBootstrapped = true;
    return;
  }

  Sentry.init({
    dsn,
    enabled: true,
    environment: getEnvironment(),
    release: getReleaseVersion(),
    tracesSampleRate: getNumericEnv("SENTRY_TRACES_SAMPLE_RATE", 0),
  });
  sentryBootstrapped = true;
}

function bootstrapOtel(serviceName?: string) {
  if (otelBootstrapped) {
    return;
  }

  const endpoint = readEnv("OTEL_EXPORTER_OTLP_ENDPOINT");

  if (!endpoint) {
    otelBootstrapped = true;
    return;
  }

  const headers = readEnv("OTEL_EXPORTER_OTLP_HEADERS");
  const exporter = new OTLPTraceExporter({
    url: endpoint,
    headers:
      headers
        ?.split(",")
        .map((segment) => segment.trim())
        .filter(Boolean)
        .reduce<Record<string, string>>((acc, segment) => {
          const separator = segment.indexOf("=");
          if (separator > 0) {
            acc[segment.slice(0, separator).trim()] = segment.slice(separator + 1).trim();
          }
          return acc;
        }, {}) ?? {},
  });

  otelSdk = new NodeSDK({
    serviceName: getTelemetryServiceName(serviceName),
    traceExporter: exporter,
  });

  try {
    otelSdk.start();
  } catch (error) {
    logEvent("warn", "otel_bootstrap_failed", {
      message: error instanceof Error ? error.message : "unknown error",
      service: getTelemetryServiceName(serviceName),
    });
  }

  otelBootstrapped = true;
}

export function initObservability(serviceName?: string) {
  if (telemetryBootstrapped) {
    return;
  }

  bootstrapSentry();
  bootstrapOtel(serviceName);
  telemetryBootstrapped = true;
}

export function getObservabilityStatus(serviceName?: string) {
  return {
    service: getTelemetryServiceName(serviceName),
    environment: getEnvironment(),
    release: getReleaseVersion(),
    sentryConfigured: Boolean(readEnv("SENTRY_DSN")),
    otlpConfigured: Boolean(readEnv("OTEL_EXPORTER_OTLP_ENDPOINT")),
  };
}

export function logEvent(
  level: LogLevel,
  message: string,
  fields: Record<string, unknown> = {}
) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: getEnvironment(),
    release: getReleaseVersion(),
    ...fields,
  });

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}

export function recordHttpRequest(args: {
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
}) {
  const labels: HttpMetricLabels = {
    method: args.method.toUpperCase(),
    route: normalizeRouteLabel(args.route),
    status_code: String(args.statusCode),
  };

  httpRequestsTotal.inc(labels);
  httpRequestDurationSeconds.observe(labels, Math.max(0, args.durationMs) / 1000);
}

export function recordAiJobOutcome(args: {
  jobName: string;
  outcome: AiJobMetricLabels["outcome"];
  startedAt: number;
}) {
  const labels = {
    job_name: args.jobName,
    outcome: args.outcome,
  } satisfies AiJobMetricLabels;

  aiJobsTotal.inc(labels);
  aiJobDurationSeconds.observe(labels, getHistogramDurationSeconds(args.startedAt));
}

export function recordAiProviderCall(args: {
  provider: string;
  operation: string;
  outcome: AiProviderMetricLabels["outcome"];
  startedAt: number;
}) {
  const labels = {
    provider: args.provider,
    operation: args.operation,
    outcome: args.outcome,
  } satisfies AiProviderMetricLabels;

  aiProviderCallsTotal.inc(labels);
  aiProviderDurationSeconds.observe(labels, getHistogramDurationSeconds(args.startedAt));
}

export function syncRuntimeGaugeSnapshot(snapshot: RuntimeGaugeSnapshot) {
  workerReadyGauge.set(snapshot.workerReady ? 1 : 0);
  workerStaleGauge.set(snapshot.workerStale ? 1 : 0);
  directExecutionGauge.set(snapshot.directExecution ? 1 : 0);
  workerHeartbeatAgeGauge.set(snapshot.heartbeatAgeSeconds);
  cleanupDeletedAudioGauge.set(snapshot.cleanupDeletedAudioAssets);
  cleanupDeletedTranscriptGauge.set(snapshot.cleanupDeletedTranscriptAssets);
  cleanupPendingExpiredAssetsGauge.set(snapshot.cleanupPendingExpiredAssets);
  cleanupFailuresGauge.set(snapshot.cleanupFailures);
  securityRateLimitDeniedGauge.set(snapshot.securityRateLimitDeniedCount);
  securityTranscriptGrantedGauge.set(snapshot.securityTranscriptGrantedCount);
  securityTranscriptBlockedGauge.set(snapshot.securityTranscriptBlockedCount);
  securityExportRequestedGauge.set(snapshot.securityExportRequestedCount);
  hostedVerificationPassedGauge.set(snapshot.hostedVerificationPassed ? 1 : 0);
  launchCertifiedGauge.set(snapshot.launchCertified ? 1 : 0);
  cancelRequestedJobsGauge.set(snapshot.cancelRequestedJobs);

  queueDepthGauge.reset();
  for (const [state, count] of Object.entries(snapshot.queueDepthByState)) {
    queueDepthGauge.set({ state }, count);
  }

  meetingStatusGauge.reset();
  for (const [status, count] of Object.entries(snapshot.meetingCountByStatus)) {
    meetingStatusGauge.set({ status }, count);
  }
}

export async function getMetricsPayload() {
  return registry.metrics();
}

export function getMetricsContentType() {
  return registry.contentType;
}

export function captureException(
  error: unknown,
  context: {
    service?: string;
    route?: string;
    jobName?: string;
    jobId?: string | null;
    meetingId?: string | null;
    userId?: string | null;
    provider?: string | null;
    stage?: string | null;
  } = {}
) {
  bootstrapSentry();

  if (!readEnv("SENTRY_DSN")) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context.service) scope.setTag("service", context.service);
    if (context.route) scope.setTag("route", context.route);
    if (context.jobName) scope.setTag("job_name", context.jobName);
    if (context.provider) scope.setTag("provider", context.provider);
    if (context.stage) scope.setTag("pipeline_stage", context.stage);
    if (context.jobId) scope.setTag("job_id", context.jobId);
    if (context.meetingId) scope.setTag("meeting_id", context.meetingId);
    if (context.userId) scope.setTag("user_id", context.userId);
    Sentry.captureException(error);
  });
}

export async function runWithTraceSpan<T>(
  name: string,
  attributes: Record<string, unknown>,
  task: (span: Span) => Promise<T>
) {
  const tracer = trace.getTracer(getTelemetryServiceName());
  return tracer.startActiveSpan(
    name,
    {
      attributes: toSpanAttributes(attributes),
    },
    async (span) => {
      try {
        const result = await task(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
        } else {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: "Unknown span failure.",
          });
        }
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

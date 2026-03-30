import { Worker, type Job } from "bullmq";

import { getRedisConnection } from "./redis.js";

type RemoteAiJobPayload = {
  jobId?: string;
  meetingId?: string;
  userId?: string;
  artifactType?: string;
};

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getPipelineMode() {
  return readEnv("AI_PIPELINE_MODE") ?? "railway_remote";
}

function getWorkerWebAppUrl() {
  return (
    readEnv("NEXTSTOP_WEB_APP_URL") ||
    readEnv("NEXT_PUBLIC_APP_URL") ||
    readEnv("APP_URL")
  );
}

function getWorkerSharedSecret() {
  return readEnv("AI_CORE_SHARED_SECRET");
}

function getJobPayload(job: Job<RemoteAiJobPayload>) {
  const payload = job.data ?? {};

  if (!payload.jobId) {
    throw new Error(`Job ${job.id ?? "unknown"} is missing jobId.`);
  }

  return payload as Required<Pick<RemoteAiJobPayload, "jobId">> & RemoteAiJobPayload;
}

function getInternalRoute(jobName: Job["name"]) {
  if (jobName === "transcribe") {
    return "/api/internal/ai/transcribe";
  }

  if (jobName === "regenerate") {
    return "/api/internal/ai/regenerate";
  }

  return null;
}

async function dispatchRemoteExecution(job: Job<RemoteAiJobPayload>) {
  const route = getInternalRoute(job.name);

  if (!route) {
    console.warn("[ai-core] Ignoring unknown job", {
      jobName: job.name,
      queueJobId: job.id,
    });
    return;
  }

  const webAppUrl = getWorkerWebAppUrl();
  const sharedSecret = getWorkerSharedSecret();

  if (!webAppUrl || !sharedSecret) {
    throw new Error(
      "Worker is missing NEXTSTOP_WEB_APP_URL/APP_URL or AI_CORE_SHARED_SECRET."
    );
  }

  const payload = getJobPayload(job);
  const targetUrl = `${trimTrailingSlash(webAppUrl)}${route}`;

  console.info("[ai-core] Dispatching queued job to web app", {
    queueJobId: job.id,
    aiJobId: payload.jobId,
    meetingId: payload.meetingId ?? null,
    route,
    targetUrl,
  });

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sharedSecret}`,
    },
    body: JSON.stringify({
      jobId: payload.jobId,
      meetingId: payload.meetingId,
      userId: payload.userId,
      artifactType: payload.artifactType,
    }),
  });

  if (!response.ok) {
    const payloadText = await response.text().catch(() => "");
    throw new Error(
      `Internal AI route ${route} failed with ${response.status}: ${payloadText || "no response body"}`
    );
  }

  console.info("[ai-core] Web app finished queued job", {
    queueJobId: job.id,
    aiJobId: payload.jobId,
    route,
  });
}

const worker = new Worker<RemoteAiJobPayload>(
  "nextstop-ai-jobs",
  async (job) => {
    await dispatchRemoteExecution(job);
  },
  { connection: getRedisConnection({ blocking: true }) }
);

worker.on("ready", () => {
  console.info("[ai-core] Transcription worker started", {
    queue: "nextstop-ai-jobs",
    pipelineMode: getPipelineMode(),
    webAppUrl: getWorkerWebAppUrl(),
  });
});

worker.on("completed", (job) => {
  console.info("[ai-core] Completed queued job", {
    queueJobId: job.id,
    jobName: job.name,
    aiJobId: job.data?.jobId ?? null,
  });
});

worker.on("failed", (job, error) => {
  console.error("[ai-core] Queued job failed", {
    queueJobId: job?.id ?? null,
    jobName: job?.name ?? null,
    aiJobId: job?.data?.jobId ?? null,
    message: error.message,
  });
});

if (getPipelineMode() === "railway_remote") {
  if (!getWorkerWebAppUrl() || !getWorkerSharedSecret()) {
    console.warn(
      "[ai-core] railway_remote mode is selected, but the worker cannot reach the web app yet. Set NEXTSTOP_WEB_APP_URL (or APP_URL) and AI_CORE_SHARED_SECRET."
    );
  }
} else {
  console.warn(
    "[ai-core] Worker started while AI_PIPELINE_MODE is not railway_remote. Remote jobs may never be enqueued from the web app."
  );
}

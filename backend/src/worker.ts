import { Worker, type Job } from "bullmq";

import {
  captureException,
  initObservability,
  logEvent,
} from "./observability.js";
import { executeQueuedJob } from "./ai-executor.js";
import { getRedisConnection } from "./redis.js";
import { markWorkerActivity, markWorkerDegraded, markWorkerHeartbeat, markWorkerReady } from "./worker-state.js";

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

function getPipelineMode() {
  return readEnv("AI_PIPELINE_MODE") ?? "railway_remote";
}

function getJobPayload(job: Job<RemoteAiJobPayload>) {
  const payload = job.data ?? {};

  if (!payload.jobId) {
    throw new Error(`Job ${job.id ?? "unknown"} is missing jobId.`);
  }

  return payload as Required<Pick<RemoteAiJobPayload, "jobId">> & RemoteAiJobPayload;
}

initObservability("nextstop-ai-worker");

const worker = new Worker<RemoteAiJobPayload>(
  "nextstop-ai-jobs",
  async (job) => {
    const payload = getJobPayload(job);
    markWorkerActivity(job.name, payload.jobId);
    await executeQueuedJob(job.name, {
      jobId: payload.jobId,
      meetingId: payload.meetingId,
      userId: payload.userId,
      artifactType: payload.artifactType,
    });
  },
  { connection: getRedisConnection({ blocking: true }) }
);

worker.on("ready", () => {
  markWorkerReady();
  logEvent("info", "worker_ready", {
    service: "nextstop-ai-worker",
    queue: "nextstop-ai-jobs",
    pipelineMode: getPipelineMode(),
    executionTarget: "railway_worker_direct",
  });
});

worker.on("active", (job) => {
  markWorkerActivity(job.name, job.data?.jobId ?? null);
});

worker.on("completed", (job) => {
  markWorkerActivity(job.name, job.data?.jobId ?? null);
  logEvent("info", "queued_job_completed", {
    service: "nextstop-ai-worker",
    queueJobId: job.id,
    jobName: job.name,
    aiJobId: job.data?.jobId ?? null,
  });
});

worker.on("failed", (job, error) => {
  markWorkerActivity(job?.name ?? "unknown", job?.data?.jobId ?? null);
  markWorkerDegraded(error.message, job?.name ?? "unknown", job?.data?.jobId ?? null);
  captureException(error, {
    service: "nextstop-ai-worker",
    jobName: job?.name ?? "unknown",
    jobId: job?.data?.jobId ?? null,
    meetingId: job?.data?.meetingId ?? null,
    userId: job?.data?.userId ?? null,
  });
  logEvent("error", "queued_job_failed", {
    service: "nextstop-ai-worker",
    queueJobId: job?.id ?? null,
    jobName: job?.name ?? null,
    aiJobId: job?.data?.jobId ?? null,
    message: error.message,
  });
});

if (getPipelineMode() !== "railway_remote") {
  logEvent("warn", "worker_pipeline_mode_mismatch", {
    service: "nextstop-ai-worker",
    pipelineMode: getPipelineMode(),
    detail:
      "Worker started while AI_PIPELINE_MODE is not railway_remote. Remote jobs may never be enqueued from the web app.",
  });
}

const idleHeartbeatIntervalMs = Number(process.env.WORKER_IDLE_HEARTBEAT_INTERVAL_MS ?? 30_000);

if (Number.isFinite(idleHeartbeatIntervalMs) && idleHeartbeatIntervalMs > 0) {
  setInterval(() => {
    markWorkerHeartbeat();
  }, idleHeartbeatIntervalMs).unref();
}

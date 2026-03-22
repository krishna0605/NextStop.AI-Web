import Fastify from "fastify";
import { Queue } from "bullmq";

import { getRedisConnection } from "./redis.js";

type TranscriptionJobPayload = {
  jobId: string;
  meetingId: string;
  userId: string;
};

type RegenerationJobPayload = TranscriptionJobPayload & {
  artifactType: string;
};

const app = Fastify({ logger: true });
const queue = new Queue("nextstop-ai-jobs", { connection: getRedisConnection() });

app.get("/health", async () => {
  return {
    ok: true,
    service: "nextstop-ai-core",
    queue: "nextstop-ai-jobs",
  };
});

function requireSecret(authHeader?: string) {
  const expected = process.env.AI_CORE_SHARED_SECRET;
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!expected || token !== expected) {
    throw new Error("Unauthorized");
  }
}

function assertTranscriptionPayload(body: unknown): TranscriptionJobPayload {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid transcription payload.");
  }

  const payload = body as Partial<TranscriptionJobPayload>;

  if (!payload.jobId || !payload.meetingId || !payload.userId) {
    throw new Error("jobId, meetingId, and userId are required.");
  }

  return {
    jobId: payload.jobId,
    meetingId: payload.meetingId,
    userId: payload.userId,
  };
}

function assertRegenerationPayload(body: unknown): RegenerationJobPayload {
  const payload = body as Partial<RegenerationJobPayload>;
  const base = assertTranscriptionPayload(body);

  if (!payload.artifactType) {
    throw new Error("artifactType is required.");
  }

  return {
    ...base,
    artifactType: payload.artifactType,
  };
}

async function enqueueJob(
  jobName: "transcribe" | "regenerate",
  payload: TranscriptionJobPayload | RegenerationJobPayload
) {
  await queue.add(jobName, payload, {
    jobId: payload.jobId,
    removeOnComplete: false,
    removeOnFail: false,
  });
}

app.post("/jobs/transcribe", async (request, reply) => {
  try {
    requireSecret(request.headers.authorization);
    const payload = assertTranscriptionPayload(request.body);
    await enqueueJob("transcribe", payload);
    return { ok: true, enqueued: "transcribe", jobId: payload.jobId };
  } catch (error) {
    reply.status(error instanceof Error && error.message === "Unauthorized" ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to enqueue transcription." };
  }
});

app.post("/jobs/finalize", async (request, reply) => {
  try {
    requireSecret(request.headers.authorization);
    const payload = assertTranscriptionPayload(request.body);
    await enqueueJob("transcribe", payload);
    return { ok: true, enqueued: "transcribe", compatibility: "finalize_alias", jobId: payload.jobId };
  } catch (error) {
    reply.status(error instanceof Error && error.message === "Unauthorized" ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to enqueue transcription." };
  }
});

app.post("/jobs/regenerate", async (request, reply) => {
  try {
    requireSecret(request.headers.authorization);
    const payload = assertRegenerationPayload(request.body);
    await enqueueJob("regenerate", payload);
    return { ok: true, enqueued: "regenerate", jobId: payload.jobId };
  } catch (error) {
    reply.status(error instanceof Error && error.message === "Unauthorized" ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to enqueue regeneration." };
  }
});

app.post("/jobs/:jobId/retry", async (request, reply) => {
  try {
    requireSecret(request.headers.authorization);
    const jobId = (request.params as { jobId: string }).jobId;
    const job = await queue.getJob(jobId);

    if (!job) {
      reply.status(404);
      return { error: "Job not found." };
    }

    const state = await job.getState();

    if (state === "failed") {
      await job.retry();
      return { ok: true, retried: true, jobId };
    }

    return { ok: true, retried: false, jobId, state };
  } catch (error) {
    reply.status(error instanceof Error && error.message === "Unauthorized" ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to retry the job." };
  }
});

app.get("/jobs/:jobId", async (request, reply) => {
  try {
    requireSecret(request.headers.authorization);
    const jobId = (request.params as { jobId: string }).jobId;
    const job = await queue.getJob(jobId);

    return {
      id: job?.id ?? jobId,
      name: job?.name ?? null,
      state: job ? await job.getState() : "missing",
      attemptsMade: job?.attemptsMade ?? 0,
    };
  } catch (error) {
    reply.status(error instanceof Error && error.message === "Unauthorized" ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to inspect the job." };
  }
});

app.listen({
  host: "0.0.0.0",
  port: Number(process.env.PORT ?? 8080),
});

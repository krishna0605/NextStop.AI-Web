import Fastify from "fastify";
import { Queue } from "bullmq";
import Redis from "ioredis";

const app = Fastify({ logger: true });
const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
const queue = new Queue("nextstop-ai-jobs", { connection: redis });

function requireSecret(authHeader?: string) {
  const expected = process.env.AI_CORE_SHARED_SECRET;
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!expected || token !== expected) {
    throw new Error("Unauthorized");
  }
}

app.post("/jobs/finalize", async (request, reply) => {
  try {
    requireSecret(request.headers.authorization);
    const body = request.body as { jobId: string; meetingId: string; userId: string };
    await queue.add("finalize", body, { jobId: body.jobId });
    return { ok: true };
  } catch (error) {
    reply.status(401);
    return { error: error instanceof Error ? error.message : "Unauthorized" };
  }
});

app.post("/jobs/regenerate", async (request, reply) => {
  try {
    requireSecret(request.headers.authorization);
    const body = request.body as {
      jobId: string;
      meetingId: string;
      userId: string;
      artifactType: string;
    };
    await queue.add("regenerate", body, { jobId: body.jobId });
    return { ok: true };
  } catch (error) {
    reply.status(401);
    return { error: error instanceof Error ? error.message : "Unauthorized" };
  }
});

app.get("/jobs/:jobId", async (request) => {
  requireSecret(request.headers.authorization);
  const jobId = (request.params as { jobId: string }).jobId;
  const job = await queue.getJob(jobId);
  return {
    id: job?.id ?? jobId,
    state: job ? await job.getState() : "missing",
  };
});

app.listen({
  host: "0.0.0.0",
  port: Number(process.env.PORT ?? 8080),
});

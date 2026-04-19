import { Queue } from "bullmq";

import { getRedisConnection } from "./redis.js";

let aiQueue: Queue | null = null;

export function getAiQueue() {
  if (!aiQueue) {
    aiQueue = new Queue("nextstop-ai-jobs", {
      connection: getRedisConnection(),
    });
  }

  return aiQueue;
}

export async function removeQueuedAiJob(jobId: string) {
  const queue = getAiQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return { removed: false, missing: true };
  }

  try {
    await job.remove();
    return { removed: true, missing: false };
  } catch {
    return { removed: false, missing: false };
  }
}

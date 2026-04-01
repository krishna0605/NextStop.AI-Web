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

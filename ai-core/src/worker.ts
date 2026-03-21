import { Worker } from "bullmq";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

new Worker(
  "nextstop-ai-jobs",
  async (job) => {
    console.log("[ai-core] Received job", job.name, job.id, job.data);
    console.log(
      "[ai-core] Hook this worker to the shared Supabase tables and Hugging Face endpoints."
    );
  },
  { connection: redis }
);

console.log("[ai-core] Worker started");

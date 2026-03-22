import { Worker } from "bullmq";

import { getRedisConnection } from "./redis.js";

new Worker(
  "nextstop-ai-jobs",
  async (job) => {
    if (job.name === "transcribe") {
      console.log("[ai-core] Received transcription job", job.id, job.data);
      console.log(
        "[ai-core] Next step: load raw audio metadata from Supabase, call Deepgram, materialize the temporary transcript asset, then hand off to findings generation."
      );
      return;
    }

    if (job.name === "regenerate") {
      console.log("[ai-core] Received regeneration job", job.id, job.data);
      console.log(
        "[ai-core] Next step: load the canonical artifact from Supabase and regenerate only the requested durable artifact."
      );
      return;
    }

    console.log("[ai-core] Ignoring unknown job", job.name, job.id);
  },
  { connection: getRedisConnection({ blocking: true }) }
);

console.log("[ai-core] Transcription worker started");

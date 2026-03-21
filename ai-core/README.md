# NextStop AI Core

Railway deployment scaffold for the async Meeting Copilot pipeline.

Services:

- `src/server.ts`: Fastify API that receives authenticated enqueue requests from the web app.
- `src/worker.ts`: BullMQ worker that would pull queued jobs and process them against Supabase Storage + Hugging Face endpoints.
- `src/cleanup.ts`: cron-friendly TTL cleanup for raw audio and transient transcript assets.

Expected env:

- `PORT`
- `REDIS_URL`
- `AI_CORE_SHARED_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `HUGGINGFACE_API_TOKEN`
- `HUGGINGFACE_ASR_ENDPOINT_URL`
- `HUGGINGFACE_DIARIZATION_ENDPOINT_URL`
- `HUGGINGFACE_LLM_ENDPOINT_URL`

This scaffold intentionally mirrors the web app contract added under `src/app/api/workspace/meetings/*`.

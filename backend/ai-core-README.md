# NextStop AI Core

Railway deployment scaffold for the async transcription-first pipeline.

Services:

- `src/server.ts`: Fastify API that receives authenticated enqueue requests from the web app and exposes job inspection and retry endpoints.
- `src/worker.ts`: BullMQ worker scaffold for Deepgram transcription, transcript normalization, Supabase asset writes, and downstream findings handoff.
- `src/cleanup.ts`: cron-friendly TTL cleanup for short-lived raw audio and transcript assets.

Recommended deployment split:

- Vercel: user-facing Next.js app and authenticated public APIs
- Supabase: auth, Postgres metadata, private `meeting-audio` and `meeting-transcripts` buckets
- Railway: `transcription-api`, `transcription-worker`, Redis, and `ttl-cleanup`
- Deepgram: primary ASR provider
- OpenAI: downstream summaries and regeneration only

Expected env:

- `PORT`
- `NODE_ENV=production`
- `REDIS_URL`
- `AI_CORE_SHARED_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPGRAM_API_KEY`
- `OPENAI_API_KEY`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT=production`
- `SENTRY_RELEASE` or `RELEASE_VERSION`
- `SENTRY_TRACES_SAMPLE_RATE=0.05`
- `OTEL_SERVICE_NAME=nextstop-ai-core-api`
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `OTEL_EXPORTER_OTLP_HEADERS` if the collector requires auth

Current job contract:

- `POST /jobs/transcribe`
- `POST /jobs/finalize` as a backward-compatible alias to `transcribe`
- `POST /jobs/regenerate`
- `POST /jobs/:jobId/retry`
- `GET /jobs/:jobId`

This scaffold mirrors the web app contract under `src/app/api/workspace/meetings/*` and is now aligned to a transcription-first lifecycle instead of the earlier generic finalize flow.

Production launch readiness depends on the `/health` observability payload proving Sentry and OTLP are configured. See [../docs/production-observability-runbook.md](../docs/production-observability-runbook.md).

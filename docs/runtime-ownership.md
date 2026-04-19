# Runtime Ownership Map

## Production boundary

- Vercel owns:
  - Next.js UI rendering
  - auth-aware page composition
  - lightweight orchestration routes under `frontend/src/app/api`
  - readiness surfacing for the web app
- Railway owns:
  - BullMQ queue execution
  - AI transcription and analysis workers
  - backend health endpoint
  - direct background execution and worker heartbeat
- Supabase owns:
  - auth
  - relational data
  - private asset storage
- Redis owns:
  - queue transport for AI jobs

## Keep on Vercel for now

- auth-coupled UI routes
- lightweight exports initiated directly by authenticated web users
- OAuth callbacks that still depend on the Next.js app router runtime
- readiness aggregation that depends on frontend envs plus Railway health

## Keep on Railway

- `/health`
- `/jobs/transcribe`
- `/jobs/analyze`
- `/jobs/regenerate`
- direct AI execution in `backend/src/worker.ts`
- background cleanup and future heavy export jobs

## Migration candidates still living in Next.js

- `frontend/src/app/api/workspace/**`
- `frontend/src/lib/ai-pipeline.ts`
- `frontend/src/lib/google-workspace.ts`
- `frontend/src/lib/notion-workspace.ts`
- server-only Supabase admin loaders

## Near-term rule

- Vercel may orchestrate authenticated requests.
- Railway must execute heavy AI work.
- New background jobs and long-running exports should default to Railway unless a strong reason keeps them in Vercel.

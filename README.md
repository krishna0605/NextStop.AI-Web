# NextStop Monorepo

This repo is now organized around two deployment roots:

- `frontend/` -> the Next.js user interface for Vercel
- `backend/` -> the Railway service package for API, workers, Redis integration, and Supabase backend assets

## Target deployment model

- Vercel: deploy `frontend/`
- Railway: deploy `backend/`
- Supabase: auth, Postgres, storage, migrations
- Redis: one Railway Redis service used by the backend

## Repository tree

```text
nextstop.ai-web/
├─ frontend/
│  ├─ src/
│  │  ├─ app/
│  │  ├─ components/
│  │  ├─ lib/
│  │  └─ test-support/
│  ├─ public/
│  ├─ tests/
│  ├─ scripts/
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ next.config.ts
│  ├─ .env.vercel.example
│  └─ README.md
├─ backend/
│  ├─ src/
│  │  ├─ index.ts
│  │  ├─ server.ts
│  │  ├─ worker.ts
│  │  └─ cleanup.ts
│  ├─ supabase/
│  │  ├─ migrations/
│  │  └─ functions/
│  ├─ package.json
│  ├─ Dockerfile
│  ├─ .env.railway.example
│  ├─ routes-manifest.md
│  └─ README.md
├─ docs/
└─ package.json
```

## Workspace commands

```bash
npm run dev:frontend
npm run build:frontend
npm run dev:backend
npm run typecheck:frontend
npm run typecheck:backend
```

## Local Docker test flow

1. Copy `frontend/.env.local.example` to `frontend/.env.local` if you do not already have one.
2. Fill in your real Supabase, Deepgram, and OpenAI secrets in `frontend/.env.local`.
3. Start the full local stack:

```bash
docker compose -f docker-compose.local.yml up --build
```

Local URLs:

- frontend: `http://localhost:3000`
- backend health: `http://localhost:8080/health`
- redis: `localhost:6379`

The Docker stack runs the Next.js frontend, the Railway-style backend worker/API, and Redis together. Browser capture still happens in your local browser at `http://localhost:3000`, but the AI queue and worker now run locally too.

## Implementation plan

See [docs/repo-split-plan.md](docs/repo-split-plan.md) for the detailed migration order and file ownership plan.

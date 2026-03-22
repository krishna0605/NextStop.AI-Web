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

## Implementation plan

See [docs/repo-split-plan.md](docs/repo-split-plan.md) for the detailed migration order and file ownership plan.

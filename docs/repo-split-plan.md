# Frontend / Backend Split Plan

## Goal

Create a maintainable two-folder repository layout:

- `frontend/` contains the Vercel-deployed Next.js app
- `backend/` contains the Railway-deployed backend service and Supabase backend assets

## Recommended migration phases

### Phase 1: Package split

- Move the current Next.js app into `frontend/`
- Move the current Railway `ai-core` service into `backend/`
- Move Supabase migrations and functions into `backend/supabase/`
- Add root workspace scripts and deployment docs

### Phase 2: Frontend boundary hardening

- Keep browser-side UI code inside `frontend/src/components`
- Route browser fetches through `NEXT_PUBLIC_BACKEND_URL`
- Remove direct browser dependence on Vercel-local `/api` routes

### Phase 3: Backend route migration

- Move route logic from `frontend/src/app/api/` to `backend/`
- Recreate those routes in the Railway backend
- Update OAuth and webhook callbacks to point to Railway
- Remove migrated route handlers from the Next.js app

### Phase 4: Server-rendered page cleanup

- Move server-only loaders out of the frontend app
- Replace server-bound dashboard data fetching with backend API calls or browser-safe auth flows
- Remove private provider secrets from Vercel once no backend logic remains there

## Ownership map

### Frontend-owned files

- `frontend/src/app/(marketing)/**`
- `frontend/src/app/(auth)/**`
- `frontend/src/app/(dashboard)/**`
- `frontend/src/components/**`
- `frontend/src/lib/public-backend.ts`
- browser-safe utility modules
- frontend tests and Playwright config

### Backend-owned files

- `backend/src/**`
- `backend/supabase/**`
- Railway Docker/runtime config
- Redis queue wiring
- provider secrets and job orchestration

### Shared migration hotspot

These currently still live under `frontend/`, but are backend candidates during the next migration phase:

- `frontend/src/app/api/**`
- `frontend/src/lib/billing-server.ts`
- `frontend/src/lib/supabase-admin.ts`
- `frontend/src/lib/supabase-server.ts`
- `frontend/src/lib/workspace-server.ts`
- `frontend/src/lib/workspace-page.ts`
- `frontend/src/lib/google-workspace.ts`
- `frontend/src/lib/notion-workspace.ts`
- `frontend/src/lib/ai-pipeline.ts`

## Deploy roots

### Vercel

- Root directory: `frontend`
- Build command: `npm run build`

### Railway

- Root directory: `backend`
- Start command: `npm run start`
- Redis: one attached Railway Redis service

## Current status

- Phase 1 is implemented in the repo structure.
- Browser-side fetches can already target an external backend URL.
- Full backend extraction is still a follow-up migration because the old Next.js route handlers remain under `frontend/src/app/api/`.

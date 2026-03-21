# NextStop Web Workspace

NextStop is a browser-first meeting capture workspace built with Next.js and Supabase. The web app handles:

- dashboard access and billing gates
- Google Calendar / Google Meet creation
- Notion export routing
- browser-tab capture controls through the global floating capture dock
- unified meeting Library and Review flows

AI/transcription services are already wired in the app, but this repo is now hardened so the non-AI product shell can ship safely to production.

## Stack

- Next.js 16
- React 19
- Supabase Auth + Postgres
- HeroUI + Tailwind
- Razorpay billing
- Google Calendar / Meet OAuth
- Notion OAuth

## Local Development

1. Copy `.env.example` to `.env.local`
2. Fill in the required keys
3. Run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Required Environment Variables

### Core app

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `APP_URL`

### Billing

- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_PLAN_ID`
- `RAZORPAY_WEBHOOK_SECRET`

### Google

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Notion

- `NOTION_CLIENT_ID`
- `NOTION_CLIENT_SECRET`
- `NOTION_OAUTH_STATE_SECRET`
- `NOTION_REDIRECT_URI`

### Existing AI/transcription dependencies

- `OPENAI_API_KEY`
- `DEEPGRAM_API_KEY`

### Transcript lifecycle

- `TRANSCRIPT_STORAGE_MODE`
  - `memory` for local/dev
  - `disabled` for production-safe fallback
- `TRANSCRIPT_RETENTION_MINUTES`
- `ALLOW_MEMORY_TRANSCRIPT_DOWNLOADS_IN_PRODUCTION`

## OAuth Redirects

### Google

Supabase social login callback:

- `https://<your-project-ref>.supabase.co/auth/v1/callback`

App redirect after auth:

- `https://<your-app-domain>/auth/callback?intent=connect-google&next=%2Fdashboard%2Fgoogle`

### Notion

Use the workspace-owned broker callback:

- `https://<your-app-domain>/api/workspace/notion/callback`

For local development:

- `http://localhost:3000/api/workspace/notion/callback`

## Readiness Check

Use:

- `GET /api/health/readiness`

This returns environment readiness, transcript mode, and major provider configuration flags without exposing secrets.

## Production Target

Primary production target:

- Vercel for the Next.js app
- Supabase for auth, database, storage, and OAuth callbacks
- Railway reserved only if a sidecar or future background worker becomes necessary

The current production-safe build does **not** require a mandatory Railway service.

## Release Checklist

See:

- [docs/production-runbook.md](docs/production-runbook.md)

## Verification

```bash
npx tsc --noEmit
npm run build
npm run lint
```

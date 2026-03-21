# Production Runbook

## Deployment Shape

- Frontend/app server: Vercel
- Backend/data/auth: Supabase
- Optional future worker/runtime: Railway

## Pre-Deploy Checklist

### GitHub Actions

- `CI` workflow is green:
  - static checks
  - Vitest suite
  - Playwright smoke
- `Security` workflow is green:
  - secret scan
  - dependency audit
  - CodeQL
- `Post Deploy Verify` workflow is ready to run against the final deployment URL

### Vercel

- Add all app env vars from `.env.example`
- Confirm `APP_URL` and `NEXT_PUBLIC_APP_URL` match the production domain
- Confirm build command is `npm run build`

### Supabase

- Confirm auth providers are enabled
- Confirm Google redirect URL points to Supabase Auth callback
- Confirm Notion redirect URL points to `/api/workspace/notion/callback`
- Confirm `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel only, never in public envs
- Confirm required tables exist:
  - `profiles`
  - `subscriptions`
  - `integrations_google`
  - `integrations_notion`
  - `web_meetings`
  - `meeting_findings`
  - `meeting_exports`

### Google

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in Vercel
- Google OAuth consent is published for intended users
- Calendar scopes are enabled

### Notion

- `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`, and `NOTION_OAUTH_STATE_SECRET` are set in Vercel
- Notion public integration redirect URI exactly matches production:
  - `https://<your-app-domain>/api/workspace/notion/callback`

### Billing

- Razorpay keys are present
- Razorpay webhook target is live and secret matches

### Transcript policy

- For tonight's production launch, prefer:
  - `TRANSCRIPT_STORAGE_MODE=disabled`
- Only allow production memory transcripts if you explicitly accept single-instance ephemeral behavior:
  - `ALLOW_MEMORY_TRANSCRIPT_DOWNLOADS_IN_PRODUCTION=true`

## Smoke Test

### Auth and access

- Log in
- Confirm `/app-entry` routes correctly
- Confirm dashboard loads
- Confirm billing-gated users are redirected correctly

### Google

- Connect Google
- Load `/dashboard/google`
- Create instant Meet
- Schedule a Meet
- Confirm scheduled meeting appears in Library

### Notion

- Connect Notion
- Load destinations
- Save destination
- Export one ready meeting to Notion

### Capture

- Open floating capture dock
- Start capture
- Grant tab share
- Pause/resume
- End session
- Confirm meeting appears in Library / Review

### Review and export

- Open review page
- Export PDF
- Validate transcript behavior matches configured transcript mode
- Export to Notion

### Operational

- `GET /api/health/readiness` returns healthy status
- No route returns raw 500s for expired Google/Notion sessions
- Latest GitHub Actions `CI` run is green
- Latest GitHub Actions `Security` run is green
- `Post Deploy Verify` passes against the deployed URL

## Rollback Checklist

- Revert latest Vercel deployment
- Restore prior env values if rollout changed URLs or OAuth config
- Recheck Supabase auth redirect URLs
- Recheck Notion redirect URI if changed during launch

## Known Production Notes

- Transcript download is intentionally bounded and not the long-term system of record
- Findings remain the durable artifact
- One active capture session per app tab is the supported constraint for this release

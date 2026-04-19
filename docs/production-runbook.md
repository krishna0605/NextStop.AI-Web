# Production Runbook

## Deployment Shape

- Frontend/app server: Vercel
- Data/auth/storage: Supabase
- Queue + AI worker/runtime: Railway
- Queue transport: Redis on Railway

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
- `PRODUCTION_BASE_URL` repository variable is configured so post-deploy verification can run automatically after `CI` succeeds on `main`
- `BACKEND_HEALTH_URL` repository variable is configured so backend worker health can be checked during certification
- `AI_CORE_SHARED_SECRET` repository secret is configured so the post-deploy workflow can publish hosted verification and launch-certification status

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
  - `ai_jobs`
  - `meeting_assets`
  - `meeting_artifacts`
  - `meeting_speaker_segments`

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

- Open the static sidebar capture controls
- Start capture
- Grant tab share
- Pause/resume
- End session
- Confirm meeting appears in Library / Review

### Durable meeting lifecycle

- Confirm the meeting can move through:
  - `Finalizing`
  - `Queued`
  - `Transcript ready`
  - `Analyzing`
  - `Ready`
- Confirm `Cancel processing` is visible for active states and disappears after completion
- Confirm temporary transcript availability can appear before final findings are ready

### Review and export

- Open review page
- Export PDF
- Validate transcript behavior matches configured transcript mode
- Export to Notion

### Operational

- `GET /api/health/readiness` returns healthy status
- `/dashboard/ops` shows worker health, recent failures, and runtime boundaries
- Railway `GET /health` reports `workerReady=true` and `directExecution=true`
- Railway `GET /health` exposes cleanup and security counters:
  - no active `lastCleanupError`
  - recent transcript/export activity is visible
- No route returns raw 500s for expired Google/Notion sessions
- Latest GitHub Actions `CI` run is green
- Latest GitHub Actions `Security` run is green
- `Post Deploy Verify` runs automatically for `main` and passes against the deployed URL

## Deployment Certification

Treat a deployment as launchable only when all of the following are true:

- `Post Deploy Verify` reports:
  - readiness check: `success`
  - backend health: `success`
  - preview smoke: `success`
- `GET /api/health/readiness` returns:
  - `launchDecision` of `ready` or an explicitly accepted `degraded`
  - zero blocking failures
- Railway `GET /health` confirms:
  - `workerReady=true`
  - `directExecution=true`
  - `workerStale=false`
  - no cleanup error
- `/dashboard/ops` shows:
  - current worker heartbeat
  - cleanup freshness
  - hosted verification summary
  - launch certification summary
  - capture runtime and finalization backlog
  - degraded meetings and export failures are understandable without raw logs
- Transcript and export routes return deterministic policy-aware failures:
  - rate limited
  - expired by retention
  - deleted by retention
  - disabled by transcript policy

## Hosted Verification Flow

Run this sequence after any production-impacting deploy:

1. Verify `GET /api/health/readiness`.
2. Verify Railway `GET /health`.
3. Open `/dashboard/ops` and confirm the launch decision matches the API.
4. Run one healthy canary meeting or fixture:
   - transcript succeeds
   - primary findings succeed
   - PDF or Notion export succeeds
5. Run one degraded-path canary:
   - fallback findings are visible in review and ops
6. Validate retention behavior on a short-lived test artifact where available:
   - cleanup deletes the artifact
   - transcript route denies access afterward

## Manual Durable-Flow Certification

For a broad production-green launch, run `Post Deploy Verify` with `workflow_dispatch` and provide `hosted_verification_results_json` that records the manual durable-flow scenarios:

- `browser_close_after_end`
- `refresh_during_finalizing`
- `transcript_ready_before_findings`
- `cancel_while_queued`
- `cancel_while_analyzing`
- `retention_expiry_route`

Recommended payload shape:

```json
{
  "browser_close_after_end": {
    "status": "pass",
    "detail": "Meeting continued to Ready after the browser closed post-queue.",
    "checkedAt": "2026-04-20T10:00:00.000Z"
  },
  "refresh_during_finalizing": {
    "status": "pass",
    "detail": "Refresh did not strand the meeting during finalization.",
    "checkedAt": "2026-04-20T10:05:00.000Z"
  }
}
```

When every automated and manual hosted scenario is green, rerun `Post Deploy Verify` with:

- `certify_launch=true`
- `certification_owner=<name or team>`
- `certification_notes=<short signoff note>`

This records both the hosted verification summary and the launch certification summary into backend runtime state so `/dashboard/ops` reflects the same evidence-backed launch story.

## Rollback Triggers

Rollback immediately when any of the following happen after deployment:

- `launchDecision=blocked`
- worker heartbeat goes stale
- cleanup begins reporting a persistent error
- transcript or export routes begin returning unexplained 500s
- healthy canary or degraded canary verification fails
- manual durable-flow certification fails
- ops surface disagrees with readiness or backend health about the runtime state

## Rollback Checklist

- Revert latest Vercel deployment
- Roll back Railway deployment if backend health or worker freshness regressed
- Restore prior env values if rollout changed URLs or OAuth config
- Recheck Supabase auth redirect URLs
- Recheck Notion redirect URI if changed during launch
- Re-run `Post Deploy Verify` against the restored deployment before re-opening launch

## Known Production Notes

- Transcript download is intentionally bounded and not the long-term system of record
- Findings remain the durable artifact
- One active capture session per app tab is the supported constraint for this release
- Export failures are now logged with status, duration, and latest error in `meeting_exports`
- Broad production-green launch requires both automated verification and manual durable-flow certification

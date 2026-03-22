# Backend Route Migration Inventory

These routes currently exist under `src/app/api` and represent the server-side surface that should be migrated to Railway if Vercel is to remain frontend-only.

## Billing

- `/api/billing/subscriptions/create`
- `/api/billing/subscriptions/verify`
- `/api/billing/trial/start`
- `/api/razorpay/webhook`

## Health

- `/api/health/readiness`

## Google workspace

- `/api/workspace/google/calendars/select`
- `/api/workspace/google/events`
- `/api/workspace/google/instant-meet`
- `/api/workspace/google/overview`

## Workspace integrations

- `/api/workspace/integrations/disconnect`
- `/api/workspace/island/context`

## Meetings

- `/api/workspace/meetings/start`
- `/api/workspace/meetings/latest/export/notion`
- `/api/workspace/meetings/[meetingId]/ai-status`
- `/api/workspace/meetings/[meetingId]/artifacts/[artifact]/regenerate`
- `/api/workspace/meetings/[meetingId]/exports/notion`
- `/api/workspace/meetings/[meetingId]/exports/pdf`
- `/api/workspace/meetings/[meetingId]/finalize`
- `/api/workspace/meetings/[meetingId]/process`
- `/api/workspace/meetings/[meetingId]/transcript`
- `/api/workspace/meetings/[meetingId]/upload-url`

## Notion workspace

- `/api/workspace/notion/callback`
- `/api/workspace/notion/connect`
- `/api/workspace/notion/destinations`
- `/api/workspace/notion/destinations/select`

## Notes

- Browser-side components now support calling a separate Railway backend via `NEXT_PUBLIC_BACKEND_URL`.
- Server-rendered pages and Next route handlers still need to be migrated before Vercel becomes a pure frontend deployment.

# Backend Layer

This folder documents the Railway-facing backend layer.

## Deployment role

Deploy the backend on Railway.

Recommended Railway footprint for a solo maintainer:

- one `backend` application service
- one Redis service

Supabase remains the system of record for:

- auth
- Postgres
- storage

## Railway variables

The single backend service should own secrets such as:

- `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPGRAM_API_KEY`
- `OPENAI_API_KEY`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `NOTION_CLIENT_SECRET`
- `AI_CORE_SHARED_SECRET`
- `REDIS_URL`

## Runtime model

The backend package now supports a single-process boot mode that starts the API and worker together:

- `npm run start`

Redis remains separate and should be attached as a Railway service variable.

## Route migration inventory

The current Next.js backend surface that should move to Railway is listed in [routes-manifest.md](routes-manifest.md).

That inventory is the source checklist for making Vercel truly frontend-only.

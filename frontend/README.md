# Frontend Layer

This folder documents the Vercel-facing frontend layer.

## Deployment role

Deploy the user interface on Vercel.

The frontend is responsible for:

- public marketing pages
- auth screens
- dashboard UI and client-side interactions
- browser-side API calls routed through `NEXT_PUBLIC_BACKEND_URL`

## Deploy root

Use `frontend` as the Vercel root directory.

## Vercel variables

Keep these on Vercel:

- `NEXT_PUBLIC_APP_URL`
- `APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BACKEND_URL`
- `AI_CORE_API_URL`
- `AI_CORE_SHARED_SECRET`
- `AI_PIPELINE_MODE`
- `AI_INLINE_FALLBACK_ENABLED`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`

During migration, some server-side Next.js flows still exist in the app. The long-term target is to remove server-only business logic from the Vercel deployment and keep private backend secrets only on Railway.

## Current migration status

Browser-side fetches now support a dedicated Railway backend origin. The remaining migration work is to move server-side route logic from `src/app/api` and server-only dashboard data loaders into the Railway backend layer.

# NextStop.ai Web Abuse-Control Inventory

Date: 2026-04-28
Scope: production-readiness score uplift follow-up for web, backend AI core, auth, billing, integration, and AI worker surfaces.

## Summary

This inventory documents the current abuse-control posture so the security score is not only based on code presence, but on named ownership and verifiable coverage. It should be reviewed before each launch certification run and after major route additions.

## Current Controls

| Surface | Primary Risk | Current Control | Verification Status | Next Hardening |
|---|---|---|---|---|
| Supabase auth routes | Account abuse, invalid sessions, callback manipulation | Supabase auth, sanitized `next` paths, server-side session checks | Covered by auth callback, billing, workspace, Notion, and Google route tests | Add replay-window monitoring at provider level |
| Billing checkout | Unauthorized subscription creation, invalid plan selection | Auth required, self-serve plan allowlist, server-side Razorpay API calls | Route tests reject unsupported plan and unauthenticated trial; success tests cover create, verify, and trial profile updates | Add live payment-provider test-mode rehearsal before launch |
| Razorpay webhook | Forged events, duplicate events, entitlement poisoning | HMAC verification, provider event id dedupe, server-side profile updates | Route tests cover missing/invalid signatures, duplicate handling, active/canceled/past-due/no-plan mapping, malformed JSON, and DB failure safety | Monitor provider webhook delivery/retry dashboard after launch |
| AI core job enqueue | Unauthorized queue insertion, malformed payloads | `AI_CORE_SHARED_SECRET`, payload validation, backend route tests | Backend tests cover unauthorized, malformed, enqueue, cancel, inspect, retry, queue failure, and stale/degraded worker health | Add production queue-depth alert thresholds |
| Web readiness | False production readiness | Production evidence gate, hosted verification, launch certification, observability checks | Readiness route tests cover production and non-production modes | Verify after deployment with live evidence payloads |
| Desktop sync APIs | Cross-user meeting access, malformed sync payloads | Bearer user auth, user-scoped Supabase filters | Backend route tests cover bootstrap auth, bootstrap success, device validation, and output sync | Add broader cross-user destructive-action tests as desktop routes expand |
| Transcript/download/export routes | Unauthorized data access, export abuse | User-scoped lookups, transcript storage mode checks | Route coverage includes meeting upload ownership and lifecycle dependency failures | Add explicit download/export throttling before public scale |
| Provider infrastructure | Volumetric abuse and scraping | Vercel/Railway/provider perimeter controls, Supabase limits | Operational dependency, tracked below as launch evidence | Document configured provider limits during launch certification |

## Provider Evidence Checklist

Production launch certification should attach proof for each provider-level control. These are intentionally evidence fields, not vague TODOs.

| Provider Surface | Required Evidence | Evidence Owner | Launch Status |
|---|---|---|---|
| Vercel Firewall or equivalent | Screenshot/link showing request filtering rules, bot/DDoS protections, and any path-specific throttles for `/api/*`. | NextStop AI maintainer | Required before `certified` launch. |
| Railway backend exposure | Screenshot/link showing public service URL, health route exposure, resource limits, restart policy, and any request/connection controls available in the plan. | NextStop AI maintainer | Required before `certified` launch. |
| Supabase auth abuse protections | Screenshot/link showing email/password/OAuth rate controls, abuse protection settings, redirect URL allowlist, and enabled providers. | NextStop AI maintainer | Required before `certified` launch. |
| Razorpay webhook controls | Screenshot/link showing webhook endpoint, signing secret configured, retry/failure dashboard visibility, and alert owner. | NextStop AI maintainer | Required before `certified` launch. |
| Sentry/OTLP abuse alerting | Screenshot/link showing production environment ingestion, alert/monitor owner, and at least one health/trace event from the current release. | NextStop AI maintainer | Required before `certified` launch. |

If a provider does not expose a native control at the current plan level, record that as an explicit accepted launch risk with owner, expiry, and compensating control.

## Routes That Should Have App-Level Rate Limits Next

1. Billing create, verify, trial start, and webhook endpoints.
2. AI internal transcribe, finalize, regenerate, upload-url, and cancel endpoints.
3. OAuth connect/callback endpoints for Google and Notion.
4. Export and transcript-download endpoints.
5. Backend AI core queue mutation endpoints.

Current repository tests prove existing guards and failure handling, but production launch certification should still include provider-side rate-limit, WAF, webhook retry, and telemetry evidence because volumetric abuse controls are not fully enforceable from this repository alone.

## Launch Certification Evidence

Before launch certification is published as `certified`, capture:

1. Security workflow result.
2. Dependency audit or active time-boxed risk acceptance.
3. Readiness payload proving no unexpected production blockers.
4. Backend `/health` payload proving hosted verification, launch certification, worker, and observability evidence.
5. Provider-side confirmation of Sentry/OTLP ingestion.
6. CI run proving frontend tests, backend tests, build, browser smoke, and security checks passed.

## Owner Notes

This is not a replacement for provider-level WAF, DDoS, auth abuse, payment-provider fraud controls, or legal review. It is a repo-level control map that makes remaining gaps visible and testable.

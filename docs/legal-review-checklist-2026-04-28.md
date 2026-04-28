# Legal Review Checklist - 2026-04-28

Status: Engineering-ready for human legal review. Not legally approved.

Owner: NextStop AI maintainer

## Required Human Review

| Area | Engineering Coverage | Human Legal Review Required |
|---|---|---|
| Privacy Policy | Public `/privacy` route exists and covers accounts, billing, meeting data, integrations, AI processing, retention, and support contact. | Confirm jurisdiction, data-controller language, processor list, retention promises, deletion workflow, and contact details. |
| Terms of Service | Public `/terms` route exists and covers account use, AI outputs, billing, acceptable use, and termination. | Confirm enforceability, limitation of liability, dispute terms, cancellation/refund wording, and AI-output disclaimers. |
| Cookie Policy | Public `/cookies` route exists and describes essential, preference, billing/security, and analytics/observability cookies. | Confirm actual cookie inventory, consent requirements, analytics provider language, and regional requirements. |
| AI Processing Disclosure | Legal pages disclose transcript/audio handling and AI processing at a starter level. | Confirm disclosures for Deepgram/OpenAI/Hugging Face or configured providers, subprocessors, and user consent. |
| Transcript And Audio Retention | Engineering config exposes transcript/raw asset retention posture. | Confirm retention period, deletion promises, export language, and support workflow. |
| Billing And Cancellation | Pricing/legal surfaces describe subscription/trial intent. | Confirm Razorpay terms, cancellation state handling, refund policy, taxes, invoices, and failed-payment treatment. |
| Third-Party Processors | Product references Supabase, Razorpay, Google, Notion, Sentry/OTLP, and AI providers where applicable. | Confirm processor list and links match live vendor configuration. |

## Launch Gate

Broad public launch requires one of:

- written human legal approval for the current policy text, or
- a signed risk acceptance that explicitly allows launch with starter legal text and lists the owner, expiry, and remediation deadline.

Launch certification should record the legal approval or risk acceptance reference in its certification notes.

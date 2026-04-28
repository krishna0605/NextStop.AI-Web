# Readiness And Security Documentation Governance

This directory intentionally tracks selected production-readiness evidence while keeping local or sensitive notes ignored by default.

## Tracked Document Classes

- Production-readiness audits and addendums that support a release or pull request.
- Dependency risk acceptance records with owner, advisory, expiry, and removal condition.
- Abuse-control inventories and provider evidence checklists.
- Release verification notes and post-deploy evidence summaries.
- Legal review checklists that track human approval status.

## Local Or Sensitive Document Classes

- Scratch notes, private incident timelines, customer-specific evidence, and secrets-adjacent deployment notes remain local unless explicitly promoted for review.
- Screenshots or exported provider evidence must be checked for secrets before being committed.
- Raw readiness, backend health, hosted verification, and launch certification payloads should normally be archived as GitHub Actions artifacts rather than committed.

## Ownership

- Readiness and release governance owner: NextStop AI maintainer.
- Security and dependency risk owner: NextStop AI maintainer.
- Legal checklist owner: NextStop AI maintainer until formal legal counsel signs off.

## Update Rules

- Update the current production-readiness audit after material release-gate changes.
- Update the release verification notes after every production post-deploy certification attempt.
- Renew or remove dependency risk acceptances before their expiry date.
- Do not mark a public launch as certified unless the current audit addendum links to passing CI and post-deploy evidence.

## Evidence Archive Policy

Post-deploy evidence should be reproducible from GitHub Actions artifacts:

- readiness payload
- backend health payload
- hosted verification payload
- launch certification prerequisites
- launch certification payload
- deployed smoke/Playwright artifacts on failure

The tracked docs should summarize those artifacts and identify the run that produced them.

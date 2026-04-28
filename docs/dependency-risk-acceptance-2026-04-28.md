# Dependency Risk Acceptance - 2026-04-28

## Accepted Advisory

- Advisory: `GHSA-qx2v-qp2m-jg93`
- Advisory link: https://github.com/advisories/GHSA-qx2v-qp2m-jg93
- OSV link: https://osv.dev/vulnerability/GHSA-qx2v-qp2m-jg93
- Package: `postcss`
- Reported path: `next@16.2.4 -> postcss@8.4.31`
- Severity: Moderate
- Accepted until: `2026-05-28`
- Owner: NextStop AI maintainer

## Reason

`npm audit --omit=dev --audit-level=high` reports the PostCSS advisory through Next's internal dependency on `postcss@8.4.31`. The root package override for `postcss@8.5.12` does not replace Next's hard-pinned nested dependency. The npm-proposed automatic fix downgrades Next to `9.3.3`, which is not an acceptable production-safe remediation.

The vulnerable package is nested under the framework build/runtime package. No application code in this remediation pass introduces user-controlled CSS stringification. The residual risk is accepted temporarily so other production advisories still fail the security workflow.

## Removal Condition

Remove this acceptance when one of the following is true:

- Next publishes a compatible patch release that depends on `postcss >= 8.5.10`.
- npm override behavior can safely replace `node_modules/next/node_modules/postcss` without breaking `npm install`, `next build`, or runtime behavior.
- The advisory is withdrawn or re-scoped so the installed Next dependency path is no longer affected.

## Guardrail

The `security:audit` script accepts only this advisory URL and expires the exception after `2026-05-28`. Any high or critical production advisory, any new moderate advisory, or this advisory after expiry fails CI.

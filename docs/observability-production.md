# Production Observability

## Scope

`nextstop.ai-web` uses a managed hybrid observability model:

- Metrics: Prometheus-compatible metrics emitted by the Railway backend
- Dashboards and alerting: Grafana / Grafana Cloud
- Traces: OpenTelemetry routed through Grafana Alloy into Tempo
- Logs: structured backend, worker, and cleanup logs routed into Loki
- Errors: Sentry for frontend and backend issue workflows
- Synthetic checks: Grafana Synthetic Monitoring

## Security model

- Raw logs, traces, and stack traces are not embedded in the app UI.
- `/dashboard/ops` is summary-only and must be restricted by:
  - `OPS_ALLOWED_EMAILS`
  - `OPS_ALLOWED_DOMAINS`
- Grafana and Sentry remain separate authenticated tools.

## Required frontend env

- `OPS_ALLOWED_EMAILS`
- `OPS_ALLOWED_DOMAINS`
- `GRAFANA_OVERVIEW_URL`
- `GRAFANA_LOGS_URL`
- `GRAFANA_TRACES_URL`
- `GRAFANA_SYNTHETIC_MONITORING_URL`
- `SENTRY_ISSUES_URL`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `SENTRY_RELEASE`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `OTEL_SERVICE_NAME`

## Required backend env

- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `SENTRY_RELEASE`
- `SENTRY_TRACES_SAMPLE_RATE`
- `OTEL_SERVICE_NAME`
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `OTEL_EXPORTER_OTLP_HEADERS`

## Local observability stack

The repo-owned local stack now includes:

- Prometheus
- Grafana
- Loki
- Tempo
- Grafana Alloy

Start it with:

```bash
npm run up:obs
```

## Verification checklist

1. Open Grafana and confirm Prometheus, Loki, and Tempo datasources are healthy.
2. Open backend `/metrics` and confirm:
   - HTTP route metrics are present
   - queue depth metrics are present
   - meeting status gauges are present
   - security and cleanup gauges are present
3. Trigger one successful AI job and confirm:
   - job outcome metrics increment
   - Deepgram or OpenAI provider metrics increment
4. Trigger one failure path and confirm:
   - Sentry receives the exception
   - logs reach Loki
   - trace reaches Tempo if OTLP is configured
5. Log in as a non-operator user and confirm `/dashboard/ops` is not accessible.
6. Log in as an operator and confirm `/dashboard/ops` exposes only summaries and external links.

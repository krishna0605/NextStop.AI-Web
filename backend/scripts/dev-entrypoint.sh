#!/bin/sh
set -eu

cd /app

if ! node -e "require.resolve('tsx/package.json'); require.resolve('fastify/package.json'); require.resolve('@sentry/node/package.json'); require.resolve('@opentelemetry/sdk-node/package.json'); require.resolve('@opentelemetry/exporter-trace-otlp-http/package.json')" >/dev/null 2>&1; then
  echo "[backend-entrypoint] Local dependencies are missing; running npm ci --include=dev"
  npm ci --include=dev
fi

echo "[backend-entrypoint] Starting: $*"
exec "$@"

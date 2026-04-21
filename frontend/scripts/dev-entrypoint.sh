#!/bin/sh
set -eu

cd /app

if ! node -e "require.resolve('next/package.json'); require.resolve('react/package.json'); require.resolve('@sentry/nextjs/package.json')" >/dev/null 2>&1; then
  echo "[frontend-entrypoint] Local dependencies are missing; running npm ci"
  npm ci
fi

echo "[frontend-entrypoint] Starting: $*"
exec "$@"

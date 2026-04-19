# Local Docker Stack

Use the Shakti-style local orchestration path when you want a single, project-aware startup command for `nextstop.ai-web` without changing the Vercel or Railway production setup.

## Local orchestration architecture

- `scripts/up.mjs` is the local control plane.
- `scripts/health.mjs` performs readiness checks and prints a runtime summary.
- `.env.local.stack` is the optional root local stack override file for ports and local-only runtime toggles.
- `docker-compose.local.yml` defines the stable local platform shape.
- `docker-compose.local.dev.yml` adds hot reload, bind mounts, ports, and dev entrypoints.
- `docker-compose.local.observability.yml` adds Prometheus and Grafana behind the optional `observability` profile.
- `backend/Dockerfile` remains production-only for Railway.
- `backend/Dockerfile.local` and `frontend/Dockerfile.local` remain local-only images.

## External dependencies

The local stack does not Dockerize third-party services. These remain hosted:

- Supabase
- OpenAI
- Deepgram
- Notion OAuth
- Razorpay

Docker starts only:

- frontend
- backend-api
- backend-worker
- backend-cleanup
- redis
- optional Prometheus and Grafana

## First-time setup

1. Copy `frontend/.env.local.example` to `frontend/.env.local`.
2. Copy `backend/.env.local.example` to `backend/.env.local`.
3. Optionally copy `local-stack.example.env` to `.env.local.stack` if you want to override local ports.
4. Fill in the required Supabase and provider secrets.
5. Start Docker Desktop.

## Commands

- `npm run up` validates env and Docker, starts the local stack, waits for readiness, and prints a runtime summary.
- `npm run up:build` does the same but rebuilds images.
- `npm run up:obs` starts the stack with Prometheus and Grafana.
- `npm run up:build:obs` rebuilds and starts the stack with observability.
- `npm run down` stops the local stack and removes orphans.
- `npm run logs` tails local stack logs.
- `npm run health` runs readiness checks without restarting anything.

## Ports

- Frontend: `http://localhost:${LOCAL_FRONTEND_PORT:-3000}`
- Backend API: `http://localhost:${LOCAL_BACKEND_PORT:-8080}`
- Redis: `localhost:${LOCAL_REDIS_PORT:-6379}`
- Prometheus: `http://localhost:${LOCAL_PROMETHEUS_PORT:-9090}` when observability is enabled
- Grafana: `http://localhost:${LOCAL_GRAFANA_PORT:-3002}` when observability is enabled

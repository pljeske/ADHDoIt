---
name: setup
description: Dev environment setup and commands. Load when setting up the project for the first time or when environment issues arise.
triggers:
  - "setup"
  - "install"
  - "environment"
  - "getting started"
  - "how do I run"
  - "local development"
edges:
  - target: context/stack.md
    condition: when specific technology versions or library details are needed
  - target: context/architecture.md
    condition: when understanding how components connect during setup
  - target: context/reminders.md
    condition: when setting up VAPID keys or SMTP for notifications
  - target: patterns/db-schema-change.md
    condition: when running migrations or sqlc generate as part of environment setup
last_updated: 2026-04-09
---

# Setup

## Prerequisites

- Docker or Podman with Compose plugin (rootless Podman supported — frontend binds 8080 not 80)
- Node.js 20+ (for frontend dev server only; not needed for Docker builds)
- Go 1.22+ (for running backend outside Docker; not needed for Docker builds)
- `sqlc` CLI (only needed when changing SQL queries: `go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest`)

## First-time Setup

1. Copy `.env.example` to `.env` and fill in required values (see Environment Variables below)
2. Generate VAPID keys if not already done: `npx web-push generate-vapid-keys` — set both in `.env`
3. `docker compose up -d --build` — builds images, starts PostgreSQL, runs migrations, starts backend + frontend
4. Frontend accessible at `http://localhost:8080`; API at `http://localhost:8080/api/v1` (proxied by Caddy)

**For frontend-only development:**
1. `cd frontend && npm install`
2. Set `VITE_API_BASE_URL=http://localhost:3001/api/v1` in `frontend/.env.local` (or start full stack with Docker)
3. `npm run dev` — Vite dev server on `http://localhost:5173`

## Environment Variables

**Required:**
- `DATABASE_URL` — PostgreSQL connection string (e.g. `postgres://adhdo:secret@db:5432/adhdo?sslmode=disable`)
- `JWT_SECRET` — min 32 characters, used for HS256 signing
- `VAPID_PUBLIC_KEY` — Web Push VAPID public key (must match `VITE_VAPID_PUBLIC_KEY`)
- `VAPID_PRIVATE_KEY` — Web Push VAPID private key
- `VAPID_SUBJECT` — Web Push contact URI (e.g. `mailto:admin@example.com`)

**Conditional:**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` — required only if email reminders are used; can be left blank in dev (reminder jobs will fail gracefully)
- `VITE_VAPID_PUBLIC_KEY` — build-time; must match `VAPID_PUBLIC_KEY`; required for Web Push in frontend

**Optional with defaults:**
- `PORT` — backend listen port (default: `8080`)
- `ENVIRONMENT` — `production` or `development`; controls log format and `.env` file loading
- `DOMAIN` — hostname for Caddy (set for production auto-TLS; leave as `localhost` for dev)
- `JWT_ACCESS_TTL` — access token lifetime (default: `15m`)
- `JWT_REFRESH_TTL` — refresh token lifetime (default: `30d`)

## Common Commands

- `docker compose up -d --build` — full rebuild and start
- `docker compose logs -f app` — stream backend logs
- `docker compose logs -f frontend` — stream Caddy/frontend logs
- `cd frontend && npm run dev` — Vite dev server with hot reload (port 5173)
- `cd frontend && npm run build` — TypeScript check + production build (faster than Docker for TS errors)
- `cd backend/internal/db && sqlc generate` — regenerate Go code from `.sql` query files (run after any query change)
- `docker compose down -v` — stop and remove containers + volumes (wipes database)

## Common Issues

**Migrations fail on startup:** Check `DATABASE_URL` is correct and the `db` service is healthy. Run `docker compose logs db` to see PostgreSQL errors. River migration runs after application migrations — both must succeed.

**Web Push 401 silently:** The `/push/subscribe` POST must go through `apiFetch`, not raw `fetch`. If push subscriptions aren't registering, check that `registerPushSubscription` in `sw.ts` uses `apiFetch`. Raw fetch sends no auth header.

**Double refresh / logout loop:** `__root.tsx` and `apiFetch`'s 401 handler both call the refresh endpoint. The `isAuthReady` flag in `auth.ts` prevents TanStack Query from firing before `__root.tsx` completes its initial refresh. If seeing logout loops, check that `isAuthReady` gates route rendering in `__root.tsx`.

**sqlc generate errors:** After modifying a `.sql` query file, always run `sqlc generate` from `backend/internal/db/`. The generated files in `backend/internal/db/*.go` (except `migrate.go` and `db.go`) are fully regenerated — do not manually edit them.

**Frontend build fails with baseUrl error:** `tsconfig.json` must NOT have `baseUrl` set. With `moduleResolution: "bundler"`, use `paths` alone. Vite resolves `@/*` via `resolve.alias`; TypeScript resolves it via `paths`.

---
name: stack
description: Technology stack, library choices, and the reasoning behind them. Load when working with specific technologies or making decisions about libraries and tools.
triggers:
  - "library"
  - "package"
  - "dependency"
  - "which tool"
  - "technology"
edges:
  - target: context/decisions.md
    condition: when the reasoning behind a tech choice is needed
  - target: context/conventions.md
    condition: when understanding how to use a technology in this codebase
  - target: context/architecture.md
    condition: when a technology question relates to how components connect
  - target: patterns/db-schema-change.md
    condition: when questions involve sqlc, pgtype, migrations, or the models.go workflow
last_updated: 2026-04-09
---

# Stack

## Core Technologies

- **Go** — backend language; module path `adhdoit`; structured logging via `log/slog` (stdlib)
- **React 18 + TypeScript** — frontend; built with Vite
- **PostgreSQL** — primary database and River job queue storage
- **Docker / Podman Compose** — local and production deployment; frontend on port 8080

## Key Libraries

**Backend:**
- **`github.com/go-chi/chi/v5`** (not Gin, not Echo) — HTTP router; middleware-first design
- **`sqlc`** (not GORM, not sqlx) — generates type-safe Go from `.sql` query files; all queries live in `backend/internal/db/queries/`; run `sqlc generate` after changing `.sql` files
- **`github.com/jackc/pgx/v5`** — PostgreSQL driver; used via `pgxpool.Pool` and the stdlib adapter for golang-migrate; `pgtype` nullables (e.g. `pgtype.Text`, `pgtype.UUID`) are used throughout
- **`github.com/golang-migrate/migrate/v4`** — DB schema migrations; SQL files in `backend/internal/db/migrations/`; runs at server startup
- **`github.com/golang-jwt/jwt/v5`** — JWT signing/parsing; HS256; access token claims contain `user_id` and `email`
- **`github.com/riverqueue/river`** — PostgreSQL-backed job queue for scheduled reminders; tables created by `rivermigrate` at startup
- **`github.com/go-playground/validator/v10`** — struct-tag validation in handlers; instance created per handler struct
- **`github.com/SherClockHolmes/webpush-go`** — Web Push notification dispatch using VAPID keys
- **`github.com/joho/godotenv`** — loads `.env` file in non-production environments only

**Frontend:**
- **`@tanstack/react-query` v5** (not SWR, not RTK Query) — all server state; query keys: `['todos', view, categoryId]` and `['categories']`; invalidate `['todos']` after any todo mutation
- **`@tanstack/react-router`** — manually wired routes via `createRoute` (NOT file-based codegen); router defined in `src/router.ts`
- **`react-hook-form` + `zod`** — form handling; custom controls require `Controller`, not `register`
- **`date-fns`** — date formatting; use `format()` for UTC→local conversion in `datetime-local` inputs
- **`zustand`** — auth state only (access token in memory, isAuthReady flag); server state goes through TanStack Query
- **shadcn/ui** (Radix UI + Tailwind CSS v4) — UI primitives; use `cn()` for all conditional classNames
- **`lucide-react`** — icons

## What We Deliberately Do NOT Use

- No ORM (no GORM, no Ent) — sqlc for type-safe query generation only
- No Redux — Zustand for auth state only; all server state in TanStack Query
- No class components — hooks only in React
- No `axios` — native `fetch` via the `apiFetch` wrapper in `src/api/client.ts`
- No Redis — River runs on PostgreSQL; no separate cache layer

## Version Constraints

- **Tailwind CSS v4** — PostCSS plugin is `@tailwindcss/postcss` (not `tailwindcss`); CSS entrypoint uses `@import "tailwindcss"` (not `@tailwind base/components/utilities`); `autoprefixer` not needed
- **TanStack Router** — manual `createRoute` wiring, not file-based codegen; adding a route requires editing `src/router.ts`

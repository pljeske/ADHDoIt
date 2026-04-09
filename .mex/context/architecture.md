---
name: architecture
description: How the major pieces of this project connect and flow. Load when working on system design, integrations, or understanding how components interact.
triggers:
  - "architecture"
  - "system design"
  - "how does X connect to Y"
  - "integration"
  - "flow"
edges:
  - target: context/stack.md
    condition: when specific technology details are needed for a component
  - target: context/decisions.md
    condition: when understanding why the architecture is structured this way
  - target: context/auth.md
    condition: when working on authentication, JWT tokens, or session management
  - target: context/reminders.md
    condition: when working on River jobs, email, or Web Push notifications
  - target: patterns/db-schema-change.md
    condition: when adding a new model field or changing the database schema
  - target: patterns/add-endpoint.md
    condition: when adding a new API route or handler
last_updated: 2026-04-09
---

# Architecture

## System Overview

HTTP request arrives → chi router (`backend/internal/server/server.go`) applies middleware stack (RealIP → RequestID → slog logging → CORS → Recoverer → 30s Timeout) → if authenticated route, `mw.Auth` middleware validates JWT and injects `uuid.UUID` into context → handler struct (e.g. `TodoHandler`) decodes and validates request → calls sqlc-generated query against PostgreSQL → returns JSON via `respondJSON`. For todo mutations involving `reminder_at`, the handler also enqueues or cancels a River job (scheduled job stored in PostgreSQL). The River worker (`worker.ReminderWorker`) fires at the scheduled time and dispatches email (SMTP) and Web Push notifications concurrently.

Frontend: TanStack Router loads route component → component calls TanStack Query hook (e.g. `useTodos`) → hook calls `apiFetch` wrapper → `apiFetch` injects `Authorization: Bearer <token>` from Zustand store → hits Go API → on 401, automatically refreshes tokens and retries once.

## Key Components

- **`backend/internal/server/server.go`** — chi router wiring; registers all routes and middleware; creates handler structs; `SetupRiver` configures the job worker pool
- **`backend/internal/handler/`** — one file per resource (`todos.go`, `auth.go`, `categories.go`, `push.go`); each handler is a struct holding `*db.Queries`, `*pgxpool.Pool`, `*river.Client`, `*config.Config`; `response.go` holds `TodoResponse` and conversion helpers; `helpers.go` holds `respondJSON`/`respondError`/`decodeJSON`
- **`backend/internal/db/`** — sqlc-generated code; `queries/` contains `.sql` source files; `migrations/` contains golang-migrate SQL files; `db.go` holds `NewWithPool`; never write raw SQL in handlers
- **`backend/internal/worker/reminder.go`** — River `ReminderWorker`; fetches todo + user + push subscriptions; dispatches email and web push in parallel goroutines; discards job silently if todo deleted or already done
- **`backend/internal/middleware/auth.go`** — validates Bearer JWT, injects `uuid.UUID` user ID into context via `model.ContextKeyUserID`; `UserIDFromContext` helper used by every authenticated handler
- **`frontend/src/api/client.ts`** — `apiFetch` wrapper; reads access token from Zustand; handles 401 with single-flight refresh (prevents double-refresh race); redirects to `/login` on session expiry
- **`frontend/src/store/auth.ts`** — Zustand store; access token in memory only; refresh token in `localStorage`; `isAuthReady` gates all route rendering
- **`frontend/src/routes/__root.tsx`** — runs single refresh on app load; sets `isAuthReady` when done; renders blank screen until ready (prevents TanStack Query from firing before auth resolves)
- **`frontend/src/components/TodoFormSheet.tsx`** — unified add/edit sheet; uses react-hook-form + zod; priority uses `Controller` (not `register`); reminder_at converted UTC→local via date-fns `format` for display
- **`frontend/src/routes/app/focus.tsx`** — Focus Mode: ADHD one-task-at-a-time view; shows current active todo with subtask progress bar; actions: Mark done, Snooze to tomorrow, Next task (skip); uses `useTodos({ view: 'today' })` and filters client-side to active tasks; wired at `/app/focus` in `src/router.ts`
- **`frontend/src/components/FilterBar.tsx`** — priority pill filter (All/Low/Medium/High) + category dropdown; used inside list-view route components; maintains filter state in parent via `TodoFilters` prop

## External Dependencies

- **PostgreSQL** — primary database for all persistent data including River job queue tables; run via Docker Compose `db` service
- **SMTP server** — outbound email for reminder notifications; configured via `SMTP_HOST/PORT/USER/PASSWORD/FROM`; called from `notification.SendReminderEmail` in the River worker
- **Web Push (FCM/browser)** — push notifications to browser subscribers; VAPID keypair required; subscriptions stored in `push_subscriptions` table; dispatched via `github.com/SherClockHolmes/webpush-go`
- **River (PostgreSQL-backed job queue)** — scheduled reminder dispatch; runs in same process as HTTP server on separate goroutines; tables created by `rivermigrate` at startup; no separate infrastructure needed

## What Does NOT Exist Here

- No Redis — River uses PostgreSQL for the job queue; no caching layer
- No admin panel — user management is self-service registration only
- No OAuth/SSO — email + password only
- No file attachments or binary storage
- No soft-delete — `DELETE` is hard delete; done status is the archive

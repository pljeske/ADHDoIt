---
name: decisions
description: Key architectural and technical decisions with reasoning. Load when making design choices or understanding why something is built a certain way.
triggers:
  - "why do we"
  - "why is it"
  - "decision"
  - "alternative"
  - "we chose"
edges:
  - target: context/architecture.md
    condition: when a decision relates to system structure
  - target: context/stack.md
    condition: when a decision relates to technology choice
  - target: context/auth.md
    condition: when a decision relates to auth strategy or token storage
  - target: context/reminders.md
    condition: when a decision relates to job queue or notification architecture
  - target: patterns/db-schema-change.md
    condition: when a decision involves the database schema or sqlc/ORM tradeoffs
last_updated: 2026-04-09
---

# Decisions

## Decision Log

### sqlc for database access (not ORM)
**Date:** 2025-04-01
**Status:** Active
**Decision:** All database access uses sqlc-generated code from raw SQL query files in `backend/internal/db/queries/`.
**Reasoning:** Type safety without ORM magic; queries are readable SQL, not ORM DSL; refactoring is explicit (change `.sql`, regenerate, fix compile errors).
**Alternatives considered:** GORM (rejected — hides queries, N+1 risks, heavy reflection); sqlx (rejected — still requires manual mapping).
**Consequences:** Every schema change requires: update migration SQL → update query SQL → `sqlc generate` → fix compilation errors. No runtime query building.

### PostgreSQL as the job queue backend (no Redis)
**Date:** 2025-04-01
**Status:** Active
**Decision:** River job queue runs on PostgreSQL — no separate Redis or broker infrastructure.
**Reasoning:** One database to operate; River's PostgreSQL implementation is production-grade; at ADHDoIt's scale there is no meaningful performance difference.
**Alternatives considered:** Redis + BullMQ (rejected — adds operational complexity); Celery/RabbitMQ (rejected — language mismatch and complexity).
**Consequences:** River job tables are co-located with application data; `rivermigrate` must run at startup before application migrations are referenced.

### JWT in-memory + refresh token in localStorage
**Date:** 2025-04-01
**Status:** Active
**Decision:** Access token stored in Zustand (memory only); refresh token stored in `localStorage`; `isAuthReady` bool gates all rendering until initial refresh resolves.
**Reasoning:** XSS can steal localStorage but httpOnly cookies require CORS credential handling that complicates the Caddy/API proxy setup; keeping access token in memory limits its exposure window to 15 minutes.
**Alternatives considered:** httpOnly cookies (rejected — requires cookie domain alignment between Caddy proxy and API, adds CSRF considerations); sessionStorage (rejected — doesn't survive tab close, poor UX for ADHD users who frequently context-switch).
**Consequences:** `isAuthReady` must be checked before rendering any authenticated UI; `__root.tsx` performs a single refresh on load; `apiFetch` handles mid-session 401s with a subscriber queue to prevent double-refresh.

### Status changes via action endpoints (not PATCH)
**Date:** 2025-04-01
**Status:** Active
**Decision:** `status` is not a patchable field — use `POST /todos/:id/done`, `/snooze`, `/reopen`.
**Reasoning:** Ensures invariants: snooze always sets `snooze_until`; done always sets `done_at`; reopen always clears both. A free-form PATCH on status would allow invalid state combinations.
**Alternatives considered:** PATCH with validation (rejected — validation logic is scattered and harder to audit).
**Consequences:** Frontend must call the correct action endpoint; `PATCH /todos/:id` accepts no `status` field.

### Tailwind CSS v4 (not v3)
**Date:** 2025-04-01
**Status:** Active
**Decision:** Frontend uses Tailwind CSS v4 with `@tailwindcss/postcss` and `@import "tailwindcss"` in CSS.
**Reasoning:** v4 is the current release; shadcn/ui is being updated to support it; `autoprefixer` is no longer required.
**Alternatives considered:** Tailwind v3 (rejected — would require downgrading shadcn/ui components and PostCSS config).
**Consequences:** CSS must use `@import "tailwindcss"` not `@tailwind` directives; PostCSS config uses `@tailwindcss/postcss`; `baseUrl` in tsconfig is deprecated and must not be used.

### TanStack Router with manual createRoute (not file-based codegen)
**Date:** 2025-04-01
**Status:** Active
**Decision:** Routes are manually defined via `createRoute()` and wired in `src/router.ts`, not generated from file structure.
**Reasoning:** Avoids the build-step dependency on file-based codegen; route tree is fully explicit and readable in one file.
**Alternatives considered:** File-based route codegen (rejected — adds a build-time watch process and obscures the route tree).
**Consequences:** Adding a new route requires: create the file in `src/routes/`, export a `createRoute()` object, and manually add it to the tree in `src/router.ts`.

### Manually maintained models.go and allTodoCols (not pure sqlc)
**Date:** 2025-04-01
**Status:** Active
**Decision:** `backend/internal/db/models.go` (the `Todo`, `User`, `Category`, etc. structs) and the `allTodoCols` string constant in `todos.sql.go` are hand-written, not generated by sqlc. The query function bodies are generated but the model types and column list constant are not.
**Reasoning:** Allows using `uuid.UUID` directly (not sqlc's default `pgtype.UUID`) for primary/foreign keys; avoids sqlc generating a parallel model package that doesn't align with the hand-maintained JSON tags and embedding strategy.
**Alternatives considered:** Full sqlc generation (rejected — sqlc's default type mappings for UUIDs and JSONB required significant override config; manual models are simpler).
**Consequences:** Any new column must be added manually to both `models.go` (struct field) and `allTodoCols` (column list). Forgetting either causes a compile error from `scanTodo`. See `patterns/db-schema-change.md` for the full workflow.

### deadline as DATE (not TIMESTAMPTZ)
**Date:** 2025-04-01
**Status:** Active
**Decision:** `todos.deadline` is a PostgreSQL `DATE` type; "today" for each view is computed as `CURRENT_DATE AT TIME ZONE user.timezone`.
**Reasoning:** A deadline is a calendar date, not an instant; storing as TIMESTAMPTZ would force a timezone choice at write time and cause confusion when users change timezone.
**Alternatives considered:** TIMESTAMPTZ with midnight in user timezone (rejected — timezone changes break historical deadlines).
**Consequences:** Overdue/today/upcoming queries must always pass the user's `timezone` string to the SQL query; the API derives the user's timezone from the `users` table, not the request.

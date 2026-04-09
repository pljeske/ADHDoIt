---
name: agents
description: Always-loaded project anchor. Read this first. Contains project identity, non-negotiables, commands, and pointer to ROUTER.md for full context.
last_updated: 2026-04-09
---

# ADHDoIt

## What This Is

A multi-user ADHD-friendly todo app — Go REST API backend + React SPA frontend, deployed via Docker Compose with PostgreSQL, background reminder jobs (River), email (SMTP), and Web Push notifications.

## Non-Negotiables

- Every DB query must be scoped by `user_id` from JWT context — never trust a user-supplied user_id
- `status` is never set via `PATCH /todos/:id` — use action endpoints (`/done`, `/snooze`, `/reopen`)
- All frontend API calls go through `apiFetch` in `src/api/client.ts` — never raw `fetch` (auth header injection + 401 retry logic lives there)
- Custom form controls (priority segmented control, etc.) must use react-hook-form `Controller` — `setValue` without `register` silently drops values on submit
- `datetime-local` inputs must display UTC timestamps via `format(new Date(utcStr), "yyyy-MM-dd'T'HH:mm")` from date-fns — never `.slice(0, 16)`

## Commands

**Full stack:**
- Build + start: `docker compose up -d --build`
- Logs: `docker compose logs -f app` / `docker compose logs -f frontend`

**Frontend dev:**
- Dev server: `cd frontend && npm run dev`
- Type-check + build: `cd frontend && npm run build`

**Backend:**
- Regenerate sqlc: `cd backend/internal/db && sqlc generate`

## Scaffold Growth

After every task: if no pattern exists for the task type you just completed, create one. If a pattern or context file is now out of date, update it. The scaffold grows from real work, not just setup. See the GROW step in `ROUTER.md` for details.

## Navigation

At the start of every session, read `ROUTER.md` before doing anything else.
For full project context, patterns, and task guidance — everything is there.

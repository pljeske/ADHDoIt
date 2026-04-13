# ADHDoIt — Claude Code Guide

## MCP-First Workflow

**ALWAYS use `code-review-graph` tools BEFORE Grep/Glob/Read.**

| Task | Tool |
|------|------|
| Find a function/class | `semantic_search_nodes` |
| Trace callers/imports | `query_graph` |
| Review a change | `detect_changes` + `get_review_context` |
| Understand blast radius | `get_impact_radius` |
| Architecture overview | `get_architecture_overview` |

Fall back to Grep/Glob/Read only when the graph doesn't cover what you need.

## Commands

```bash
docker compose up -d --build          # full stack
docker compose logs -f app            # backend logs
docker compose logs -f frontend       # frontend logs
cd frontend && npm run dev            # frontend dev server
cd frontend && npm run build          # type-check + prod build
cd backend/internal/db && sqlc generate  # regenerate queries
```

## Project Overview

ADHDoIt is a multi-user, ADHD-friendly todo app. Smart views prevent overdue todos from cluttering Today. Reminders via email + Web Push. Categories, priority, flexible sorting.

- **Backend**: stateless Go REST API (`chi`, `sqlc`, `pgx`, `river`)
- **Frontend**: React SPA (`TanStack Query/Router`, `shadcn/ui`, `zustand`)
- **Infrastructure**: Docker/Podman Compose; Caddy serves frontend + proxies API

Full specs: @docs/pages/product-spec.adoc | Runbook: @docs/pages/runbook.adoc

## Critical Constraints

- **Every DB query must be user-scoped** — filter by `user_id` from JWT. Never trust user-supplied `user_id`.
- **`status` is immutable via PATCH** — use `/done`, `/reopen`, `/snooze` action endpoints.
- **Overdue is derived, never stored** — `deadline < today_in_user_tz AND status = 'active'`.
- **Hard delete only** — no soft delete; `done` status is the archive.
- **Snooze = reschedule deadline** — does not change `status`.
- **deadline is DATE, reminder_at is TIMESTAMPTZ** — never mix them.

## ADHD UX Doctrine

- **Low cognitive load**: one primary action visible at a time; no decision paralysis.
- **Quick Capture first**: `QuickCapture` bar at top of every list view — Enter to save, Esc to cancel.
- **Overdue never disappears**: collapsed "X overdue" section at the bottom of Today; always accessible.
- **Visible affordances**: actions (edit, reschedule, delete) appear on hover/focus, not buried in menus.
- **Keyboard shortcut**: `n` opens new todo sheet globally.
- **Optimistic updates**: mutations apply immediately; no waiting spinners for the happy path.

## Quality Bar

- Table-driven tests with `net/http/httptest` for every handler (happy path + unauthenticated).
- `npm run build` must pass before any frontend PR.
- Use `cn()` for all conditional classNames; no inline styles except where Tailwind is insufficient.
- Use `Controller` for all non-native `react-hook-form` fields (custom pickers, segmented controls).

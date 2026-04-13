---
paths: ["backend/**"]
---

# Backend Rules (Go / DB / API)

## Security
- Always filter DB queries by `user_id` from JWT context — never from request body.
- UUID PKs everywhere: `uuid.New()` in Go, `gen_random_uuid()` in SQL.
- Never expose password hashes or token hashes in API responses.

## Handler Pattern
- One `Handler` struct per resource holding `*db.Queries`, `*pgxpool.Pool`, `*river.Client[pgx.Tx]`, `*config.Config`.
- Decode → validate with `go-playground/validator` → sqlc query → `respondJSON` / `respondError`.
- Always assign **every** request field to the sqlc params struct — a missed assignment silently stores zero values.

## DB / sqlc
- SQL queries live in `backend/internal/db/queries/`; run `sqlc generate` after any `.sql` change.
- Commit generated sqlc files.
- Separate named queries per view (`ListTodosToday`, `ListTodosUpcoming`, etc.) — do not use a single mega-query with `sqlc.narg()`.
- `deadline` is `DATE`; `reminder_at` is `TIMESTAMPTZ` — never interchange.
- Overdue is derived (`deadline < today_in_user_tz AND status = 'active'`); never store it.

## Status Mutations
- `status` is **not** patchable via `PATCH /todos/:id`.
- Use action endpoints: `POST /todos/:id/done`, `/reopen`, `/snooze`.
- Snooze reschedules `deadline`; it does **not** change `status`.

## River Jobs
- Enqueue reminder jobs transactionally alongside the todo write.
- Store `reminder_job_id` on `todos`; call `riverClient.JobCancel` before re-enqueueing on `reminder_at` change.
- Worker must skip silently if todo is missing or `status = done`.

## JWT
- Access token: 15m, HS256, claims `user_id` + `email`.
- Refresh token: random 32-byte, SHA-256 hashed in DB, rotated on every use.
- Auth middleware applied per-route group, not globally.

## Middleware Order
`RealIP → RequestID → slogMiddleware → cors.Handler → Recoverer → Timeout(30s)`

## Tests
- Table-driven tests with `net/http/httptest` for every handler.
- Minimum: happy path + unauthenticated case per endpoint.
- Do not mock the DB — use a real test database or `pgxmock` only for pure unit tests.

## Docker
- Build context is `./backend`; Dockerfile at `backend/Dockerfile`.
- Inject `VERSION`, `COMMIT`, `BUILD_DATE` build args as OCI labels.

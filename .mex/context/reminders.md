---
name: reminders
description: River job queue for scheduled reminders, email dispatch, and Web Push notifications. Load when working on reminder scheduling, notifications, or the worker.
triggers:
  - "reminder"
  - "River"
  - "job"
  - "notification"
  - "push"
  - "email"
  - "VAPID"
  - "web push"
  - "worker"
  - "schedule"
edges:
  - target: context/architecture.md
    condition: when understanding how the worker integrates with the HTTP server
  - target: context/decisions.md
    condition: when questioning why River/PostgreSQL is used instead of Redis
  - target: context/stack.md
    condition: when details about River, webpush-go, or SMTP libraries are needed
  - target: patterns/reminder-jobs.md
    condition: when modifying reminder scheduling logic or adding new job types
  - target: patterns/add-endpoint.md
    condition: when adding a new endpoint that schedules or interacts with reminders
last_updated: 2026-04-09
---

# Reminders

## Overview

Reminders are scheduled River jobs stored in PostgreSQL. When a todo's `reminder_at` is set, the handler enqueues a `ReminderArgs` job scheduled at that timestamp. At fire time, the `ReminderWorker` dispatches email and Web Push notifications concurrently.

## River Job Architecture

- **Job type**: `ReminderArgs{TodoID, UserID}` — `Kind()` returns `"reminder"`
- **Worker**: `backend/internal/worker/reminder.go` → `ReminderWorker`
- **Scheduling**: `river.InsertOpts{ScheduledAt: todo.ReminderAt.Time}` — job fires at the reminder timestamp
- **Job ID tracking**: `todos.reminder_job_id` (BIGINT) stores the River job ID; used to cancel existing jobs when `reminder_at` changes

## Enqueue / Cancel Flow (in `TodoHandler.scheduleReminder`)

```go
// 1. Open a transaction (ensures job + todo update are atomic)
tx, err := h.pool.Begin(ctx)

// 2. Insert the River job inside the transaction
res, err := h.river.InsertTx(ctx, tx, worker.ReminderArgs{
    TodoID: todo.ID.String(),
    UserID: todo.UserID.String(),
}, &river.InsertOpts{ScheduledAt: todo.ReminderAt.Time})

// 3. Commit
tx.Commit(ctx)

// 4. Store job ID on the todo (separate UpdateTodo call after commit)
params.ReminderJobID = pgtype.Int8{Int64: res.Job.ID, Valid: true}
h.q.UpdateTodo(ctx, updateParams)
```

**To cancel**: `h.river.JobCancel(ctx, existing.ReminderJobID.Int64)` — called before enqueueing a new job when `reminder_at` changes, and on todo delete.

## Worker Logic (`ReminderWorker.Work`)

1. Parse `TodoID` and `UserID` UUIDs — return `nil` (discard) on parse error
2. Fetch todo — if `pgx.ErrNoRows`, return `nil` (todo deleted)
3. If `todo.Status == done`, return `nil` (already completed)
4. Fetch user record (for email + timezone)
5. Fetch push subscriptions for user
6. Launch goroutines: one for email (`notification.SendReminderEmail`), one per push subscription (`notification.SendWebPush`)
7. Wait for all goroutines via buffered channel
8. Log result — **never fail the job** if one notification channel errors; log warnings only

## Web Push Architecture

- VAPID keys generated once: `npx web-push generate-vapid-keys`
- Keys stored in env: `VAPID_PUBLIC_KEY` (server + Vite build), `VAPID_PRIVATE_KEY` (server only)
- Browser subscription stored in `push_subscriptions` table (`endpoint`, `p256dh`, `auth`)
- `public/sw.js` handles `push` events and shows notifications; wraps `event.data?.json()` in try-catch (some push services send plain text)
- `src/lib/sw.ts` registers the service worker and POSTs subscription to `/api/v1/push/subscribe` using `apiFetch` (not raw fetch — JWT required)

## Email Architecture

- SMTP: `notification.SendReminderEmail(cfg, userEmail, userName, todoTitle)`
- Config from env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- Failure is logged as a warning; does not fail the River job

## Startup Sequence

Migrations must complete before River starts:
```
1. golang-migrate (application schema) runs first
2. rivermigrate.Migrate(ctx, DirectionUp) runs second (creates river_* tables)
3. river.NewClient + client.Start(ctx) starts the worker
4. HTTP server starts
```

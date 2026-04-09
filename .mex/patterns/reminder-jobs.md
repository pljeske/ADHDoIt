---
name: reminder-jobs
description: Working with River job scheduling — enqueue, cancel, and update reminder jobs when reminder_at changes on a todo.
triggers:
  - "reminder"
  - "River job"
  - "schedule job"
  - "cancel job"
  - "reminder_at"
  - "ReminderArgs"
  - "notification"
edges:
  - target: context/reminders.md
    condition: always — read for full River/email/Web Push architecture
  - target: context/conventions.md
    condition: when writing handler code around job scheduling
  - target: patterns/add-endpoint.md
    condition: when the reminder change is part of a new endpoint
last_updated: 2026-04-09
---

# Reminder Jobs

## Context

Load `context/reminders.md` for the full River architecture. This pattern covers the correct flow for enqueue, update, and cancel of reminder jobs in Go handlers.

## Steps: Schedule a Reminder

Use the `scheduleReminder` helper in `TodoHandler` (already exists in `backend/internal/handler/todos.go`):

```go
// After creating or updating a todo with a valid reminder_at:
if todo.ReminderAt.Valid && h.river != nil {
    h.scheduleReminder(r.Context(), todo)
}
```

`scheduleReminder` opens a transaction, inserts the River job, commits, then stores the job ID on the todo via a second `UpdateTodo` call.

## Steps: Cancel an Existing Reminder (when reminder_at changes or is cleared)

```go
// In the Update handler, BEFORE calling UpdateTodo:
if reminderChanged && existing.ReminderJobID.Valid && h.river != nil {
    if _, err := h.river.JobCancel(r.Context(), existing.ReminderJobID.Int64); err != nil {
        slog.Warn("failed to cancel reminder job", "job_id", existing.ReminderJobID.Int64, "err", err)
    }
    params.ReminderJobID = pgtype.Int8{} // clear the job ID
}
```

Then call `scheduleReminder` if the new `reminder_at` is set.

## Steps: Cancel on Delete

```go
// In the Delete handler, before calling DeleteTodo:
existing, err := h.q.GetTodo(r.Context(), id, userID)
if err == nil && existing.ReminderJobID.Valid && h.river != nil {
    if _, err := h.river.JobCancel(r.Context(), existing.ReminderJobID.Int64); err != nil {
        slog.Warn("failed to cancel reminder job on delete", "err", err)
    }
}
```

## Gotchas

- **ReminderJobID is on the todo**: The River job ID is stored as `todos.reminder_job_id` (BIGINT). The sqlc `UpdateTodoParams` includes `ReminderJobID pgtype.Int8` — always carry it forward from the existing record unless explicitly clearing it.
- **Don't fail the handler if job cancel fails**: River's `JobCancel` may fail if the job already ran or was cancelled. Log a warning, continue.
- **Transaction for enqueue**: `river.InsertTx` must be called inside a transaction, then the job ID is stored in a separate `UpdateTodo` call after commit. The two-step design means the job fires even if the UpdateTodo call fails — acceptable tradeoff.
- **h.river nil check**: `h.river` can be nil in tests. Always guard: `if h.river != nil`.
- **Web Push registration uses apiFetch**: `registerPushSubscription` in `src/lib/sw.ts` must use `apiFetch`, not raw `fetch` — the JWT is in memory, not in cookies, so raw fetch sends no auth header.
- **sw.js push event try-catch**: `event.data?.json()` must be wrapped in try-catch — some push services send plain text, which causes an unhandled parse error that silently swallows the notification.

## Verify

- [ ] Existing job is cancelled before enqueueing a new one when `reminder_at` changes
- [ ] `params.ReminderJobID` is cleared (set to `pgtype.Int8{}`) when cancelling
- [ ] `h.river != nil` is checked before any River calls
- [ ] `scheduleReminder` is only called when `todo.ReminderAt.Valid`
- [ ] Frontend's push subscription POST goes through `apiFetch`, not raw fetch
- [ ] `sw.js` wraps `event.data?.json()` in try-catch

## Debug

**Job scheduled but notification never fires:**
1. Check `todos.reminder_at` is set and in the future: query DB directly
2. Check `todos.reminder_job_id` has a value — if null, the `scheduleReminder` call failed (check logs for "failed to enqueue reminder")
3. Check River job status: `SELECT * FROM river_jobs WHERE id = <job_id>;`
4. Check VAPID keys match between `VAPID_PUBLIC_KEY` and `VITE_VAPID_PUBLIC_KEY`
5. Check push subscription exists: `SELECT * FROM push_subscriptions WHERE user_id = '<uid>';`

**Job fires but email not received:**
- Check SMTP env vars; `notification.SendReminderEmail` logs a warning on failure but doesn't fail the job

**Push notification arrives but shows wrong content:**
- Check `sw.js` event handler; ensure `event.data?.json()` is wrapped in try-catch

## Update Scaffold

- [ ] Update `.mex/ROUTER.md` "Current Project State" if what's working/not built has changed
- [ ] Update any `.mex/context/` files that are now out of date
- [ ] If this is a new task type without a pattern, create one in `.mex/patterns/` and add to `INDEX.md`

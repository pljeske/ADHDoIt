-- name: CreateTodo :one
INSERT INTO todos (user_id, category_id, title, description, deadline, reminder_at, priority, duration_minutes, subtasks, recurrence_rule, recurrence_end_date)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: CreateTodoFromRecurrence :one
INSERT INTO todos (user_id, category_id, title, description, deadline, reminder_at, priority, duration_minutes, subtasks, recurrence_rule, recurrence_end_date)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetTodo :one
SELECT * FROM todos WHERE id = $1 AND user_id = $2;

-- name: UpdateTodo :one
UPDATE todos
SET category_id      = $3,
    title            = $4,
    description      = $5,
    deadline         = $6,
    reminder_at      = $7,
    reminder_job_id  = $8,
    priority         = $9,
    duration_minutes = $10,
    subtasks         = $11,
    recurrence_rule  = $12,
    recurrence_end_date = $13,
    updated_at       = NOW()
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: SetTodoDone :one
UPDATE todos SET status = 'done', done_at = NOW(), updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: SnoozeTodo :one
UPDATE todos SET deadline = $3, snooze_until = NULL, updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: ReopenTodo :one
UPDATE todos SET status = 'active', done_at = NULL, snooze_until = NULL, updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: DeleteTodo :exec
DELETE FROM todos WHERE id = $1 AND user_id = $2;

-- name: ListTodosToday :many
SELECT * FROM todos
WHERE user_id = $1
  AND status = 'active'
  AND deadline = (CURRENT_DATE AT TIME ZONE (sqlc.arg(timezone)::text))::date
ORDER BY priority DESC, deadline ASC, created_at ASC;

-- name: ListTodosUpcoming :many
SELECT * FROM todos
WHERE user_id = $1
  AND status = 'active'
  AND deadline > (CURRENT_DATE AT TIME ZONE (sqlc.arg(timezone)::text))::date
ORDER BY deadline ASC, priority DESC, created_at ASC;

-- name: ListTodosOverdue :many
SELECT * FROM todos
WHERE user_id = $1
  AND status IN ('active', 'snoozed')
  AND deadline < (CURRENT_DATE AT TIME ZONE (sqlc.arg(timezone)::text))::date
ORDER BY deadline ASC, priority DESC, created_at ASC;

-- name: ListTodosDone :many
SELECT * FROM todos
WHERE user_id = $1
  AND status = 'done'
ORDER BY done_at DESC;

-- name: ListTodosByCategory :many
SELECT * FROM todos
WHERE user_id = $1
  AND category_id = $2
  AND status != 'done'
ORDER BY deadline ASC, priority DESC, created_at ASC;

-- name: GetTodosWithDueReminder :many
SELECT * FROM todos
WHERE reminder_at IS NOT NULL
  AND reminder_at <= NOW()
  AND status != 'done';

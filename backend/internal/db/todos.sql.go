package db

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

const allTodoCols = `id, user_id, category_id, title, description, deadline, reminder_at, reminder_job_id, priority, status, snooze_until, done_at, created_at, updated_at, duration_minutes, subtasks, recurrence_rule, recurrence_end_date`

const createTodo = `
INSERT INTO todos (user_id, category_id, title, description, deadline, reminder_at, priority, duration_minutes, subtasks, recurrence_rule, recurrence_end_date)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)
RETURNING ` + allTodoCols

type CreateTodoParams struct {
	UserID            uuid.UUID
	CategoryID        pgtype.UUID
	Title             string
	Description       pgtype.Text
	Deadline          pgtype.Date
	ReminderAt        pgtype.Timestamptz
	Priority          int16
	DurationMinutes   pgtype.Int4
	Subtasks          []byte
	RecurrenceRule    pgtype.Text
	RecurrenceEndDate pgtype.Date
}

func (q *Queries) CreateTodo(ctx context.Context, p *CreateTodoParams) (*Todo, error) {
	subtasks := p.Subtasks
	if len(subtasks) == 0 {
		subtasks = []byte("[]")
	}
	row := q.db.QueryRow(ctx, createTodo,
		p.UserID, p.CategoryID, p.Title, p.Description, p.Deadline, p.ReminderAt, p.Priority,
		p.DurationMinutes, subtasks, p.RecurrenceRule, p.RecurrenceEndDate,
	)
	return scanTodo(row)
}

const createTodoFromRecurrence = `
INSERT INTO todos (user_id, category_id, title, description, deadline, reminder_at, priority,
                   duration_minutes, subtasks, recurrence_rule, recurrence_end_date)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)
RETURNING ` + allTodoCols

type CreateTodoFromRecurrenceParams struct {
	UserID            uuid.UUID
	CategoryID        pgtype.UUID
	Title             string
	Description       pgtype.Text
	Deadline          pgtype.Date
	ReminderAt        pgtype.Timestamptz
	Priority          int16
	DurationMinutes   pgtype.Int4
	Subtasks          []byte
	RecurrenceRule    pgtype.Text
	RecurrenceEndDate pgtype.Date
}

func (q *Queries) CreateTodoFromRecurrence(ctx context.Context, p *CreateTodoFromRecurrenceParams) (*Todo, error) {
	subtasks := p.Subtasks
	if len(subtasks) == 0 {
		subtasks = []byte("[]")
	}
	row := q.db.QueryRow(ctx, createTodoFromRecurrence,
		p.UserID, p.CategoryID, p.Title, p.Description, p.Deadline, p.ReminderAt, p.Priority,
		p.DurationMinutes, subtasks, p.RecurrenceRule, p.RecurrenceEndDate,
	)
	return scanTodo(row)
}

const getTodo = `
SELECT ` + allTodoCols + `
FROM todos WHERE id = $1 AND user_id = $2
`

func (q *Queries) GetTodo(ctx context.Context, id, userID uuid.UUID) (*Todo, error) {
	row := q.db.QueryRow(ctx, getTodo, id, userID)
	return scanTodo(row)
}

const updateTodo = `
UPDATE todos
SET category_id        = $3,
    title              = $4,
    description        = $5,
    deadline           = $6,
    reminder_at        = $7,
    reminder_job_id    = $8,
    priority           = $9,
    duration_minutes   = $10,
    subtasks           = $11::jsonb,
    recurrence_rule    = $12,
    recurrence_end_date = $13,
    updated_at         = NOW()
WHERE id = $1 AND user_id = $2
RETURNING ` + allTodoCols

type UpdateTodoParams struct {
	ID                uuid.UUID
	UserID            uuid.UUID
	CategoryID        pgtype.UUID
	Title             string
	Description       pgtype.Text
	Deadline          pgtype.Date
	ReminderAt        pgtype.Timestamptz
	ReminderJobID     pgtype.Int8
	Priority          int16
	DurationMinutes   pgtype.Int4
	Subtasks          []byte
	RecurrenceRule    pgtype.Text
	RecurrenceEndDate pgtype.Date
}

func (q *Queries) UpdateTodo(ctx context.Context, p *UpdateTodoParams) (*Todo, error) {
	subtasks := p.Subtasks
	if len(subtasks) == 0 {
		subtasks = []byte("[]")
	}
	row := q.db.QueryRow(ctx, updateTodo,
		p.ID, p.UserID, p.CategoryID, p.Title, p.Description, p.Deadline,
		p.ReminderAt, p.ReminderJobID, p.Priority, p.DurationMinutes, subtasks,
		p.RecurrenceRule, p.RecurrenceEndDate,
	)
	return scanTodo(row)
}

const setTodoDone = `
UPDATE todos SET status = 'done', done_at = NOW(), updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING ` + allTodoCols

func (q *Queries) SetTodoDone(ctx context.Context, id, userID uuid.UUID) (*Todo, error) {
	row := q.db.QueryRow(ctx, setTodoDone, id, userID)
	return scanTodo(row)
}

const snoozeTodo = `
UPDATE todos SET deadline = $3, snooze_until = NULL, updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING ` + allTodoCols

func (q *Queries) SnoozeTodo(ctx context.Context, id, userID uuid.UUID, snoozeUntil pgtype.Date) (*Todo, error) {
	row := q.db.QueryRow(ctx, snoozeTodo, id, userID, snoozeUntil)
	return scanTodo(row)
}

const reopenTodo = `
UPDATE todos SET status = 'active', done_at = NULL, snooze_until = NULL, updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING ` + allTodoCols

func (q *Queries) ReopenTodo(ctx context.Context, id, userID uuid.UUID) (*Todo, error) {
	row := q.db.QueryRow(ctx, reopenTodo, id, userID)
	return scanTodo(row)
}

const deleteTodo = `DELETE FROM todos WHERE id = $1 AND user_id = $2`

func (q *Queries) DeleteTodo(ctx context.Context, id, userID uuid.UUID) error {
	_, err := q.db.Exec(ctx, deleteTodo, id, userID)
	return err
}

const listTodosToday = `
SELECT ` + allTodoCols + `
FROM todos
WHERE user_id = $1
  AND status = 'active'
  AND deadline = (CURRENT_DATE AT TIME ZONE $2)::date
ORDER BY priority DESC, deadline ASC, created_at ASC
`

func (q *Queries) ListTodosToday(ctx context.Context, userID uuid.UUID, timezone string) ([]*Todo, error) {
	return q.listTodos(ctx, listTodosToday, userID, timezone)
}

const listTodosUpcoming = `
SELECT ` + allTodoCols + `
FROM todos
WHERE user_id = $1
  AND status = 'active'
  AND deadline > (CURRENT_DATE AT TIME ZONE $2)::date
ORDER BY deadline ASC, priority DESC, created_at ASC
`

func (q *Queries) ListTodosUpcoming(ctx context.Context, userID uuid.UUID, timezone string) ([]*Todo, error) {
	return q.listTodos(ctx, listTodosUpcoming, userID, timezone)
}

const listTodosOverdue = `
SELECT ` + allTodoCols + `
FROM todos
WHERE user_id = $1
  AND status IN ('active', 'snoozed')
  AND deadline < (CURRENT_DATE AT TIME ZONE $2)::date
ORDER BY deadline ASC, priority DESC, created_at ASC
`

func (q *Queries) ListTodosOverdue(ctx context.Context, userID uuid.UUID, timezone string) ([]*Todo, error) {
	return q.listTodos(ctx, listTodosOverdue, userID, timezone)
}

func (q *Queries) listTodos(ctx context.Context, query string, userID uuid.UUID, timezone string) ([]*Todo, error) {
	rows, err := q.db.Query(ctx, query, userID, timezone)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var todos []*Todo
	for rows.Next() {
		t, err := scanTodoRows(rows)
		if err != nil {
			return nil, err
		}
		todos = append(todos, t)
	}
	return todos, rows.Err()
}

const listTodosDone = `
SELECT ` + allTodoCols + `
FROM todos
WHERE user_id = $1
  AND status = 'done'
ORDER BY done_at DESC
`

func (q *Queries) ListTodosDone(ctx context.Context, userID uuid.UUID) ([]*Todo, error) {
	rows, err := q.db.Query(ctx, listTodosDone, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var todos []*Todo
	for rows.Next() {
		t, err := scanTodoRows(rows)
		if err != nil {
			return nil, err
		}
		todos = append(todos, t)
	}
	return todos, rows.Err()
}

const listTodosByCategory = `
SELECT ` + allTodoCols + `
FROM todos
WHERE user_id = $1
  AND category_id = $2
  AND status != 'done'
ORDER BY deadline ASC, priority DESC, created_at ASC
`

func (q *Queries) ListTodosByCategory(ctx context.Context, userID, categoryID uuid.UUID) ([]*Todo, error) {
	rows, err := q.db.Query(ctx, listTodosByCategory, userID, categoryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var todos []*Todo
	for rows.Next() {
		t, err := scanTodoRows(rows)
		if err != nil {
			return nil, err
		}
		todos = append(todos, t)
	}
	return todos, rows.Err()
}

const getTodosWithDueReminder = `
SELECT ` + allTodoCols + `
FROM todos
WHERE reminder_at IS NOT NULL
  AND reminder_at <= NOW()
  AND status != 'done'
`

func (q *Queries) GetTodosWithDueReminder(ctx context.Context) ([]*Todo, error) {
	rows, err := q.db.Query(ctx, getTodosWithDueReminder)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var todos []*Todo
	for rows.Next() {
		t, err := scanTodoRows(rows)
		if err != nil {
			return nil, err
		}
		todos = append(todos, t)
	}
	return todos, rows.Err()
}

func scanTodo(row interface{ Scan(...any) error }) (*Todo, error) {
	var t Todo
	err := row.Scan(
		&t.ID, &t.UserID, &t.CategoryID, &t.Title, &t.Description,
		&t.Deadline, &t.ReminderAt, &t.ReminderJobID, &t.Priority, &t.Status,
		&t.SnoozeUntil, &t.DoneAt, &t.CreatedAt, &t.UpdatedAt,
		&t.DurationMinutes, &t.Subtasks, &t.RecurrenceRule, &t.RecurrenceEndDate,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func scanTodoRows(rows interface{ Scan(...any) error }) (*Todo, error) {
	return scanTodo(rows)
}

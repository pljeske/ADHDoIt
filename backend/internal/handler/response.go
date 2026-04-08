package handler

import (
	"time"

	"adhdo-it/internal/db"

	"github.com/google/uuid"
)

// TodoResponse is the JSON representation of a todo sent to the client.
// It converts pgtype nullable fields to plain Go nullable types so the
// JSON output is clean (strings, numbers, nulls — no nested structs).
type TodoResponse struct {
	ID          uuid.UUID     `json:"id"`
	UserID      uuid.UUID     `json:"user_id"`
	CategoryID  *uuid.UUID    `json:"category_id"`
	Title       string        `json:"title"`
	Description *string       `json:"description"`
	Deadline    *string       `json:"deadline"`    // "YYYY-MM-DD"
	ReminderAt  *time.Time    `json:"reminder_at"` // RFC3339
	Priority    int16         `json:"priority"`
	Status      db.TodoStatus `json:"status"`
	SnoozeUntil *string       `json:"snooze_until"` // "YYYY-MM-DD"
	DoneAt      *time.Time    `json:"done_at"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

func toTodoResponse(t *db.Todo) TodoResponse {
	r := TodoResponse{
		ID:        t.ID,
		UserID:    t.UserID,
		Title:     t.Title,
		Priority:  t.Priority,
		Status:    t.Status,
		CreatedAt: t.CreatedAt,
		UpdatedAt: t.UpdatedAt,
	}

	if t.CategoryID.Valid {
		id := uuid.UUID(t.CategoryID.Bytes)
		r.CategoryID = &id
	}
	if t.Description.Valid {
		r.Description = &t.Description.String
	}
	if t.Deadline.Valid {
		s := t.Deadline.Time.Format("2006-01-02")
		r.Deadline = &s
	}
	if t.ReminderAt.Valid {
		r.ReminderAt = &t.ReminderAt.Time
	}
	if t.SnoozeUntil.Valid {
		s := t.SnoozeUntil.Time.Format("2006-01-02")
		r.SnoozeUntil = &s
	}
	if t.DoneAt.Valid {
		r.DoneAt = &t.DoneAt.Time
	}

	return r
}

func toTodoResponses(todos []*db.Todo) []TodoResponse {
	out := make([]TodoResponse, len(todos))
	for i, t := range todos {
		out[i] = toTodoResponse(t)
	}
	return out
}

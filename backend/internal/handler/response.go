package handler

import (
	"encoding/json"
	"time"

	"adhdoit/internal/db"

	"github.com/google/uuid"
)

// SubtaskItem is an individual step within a todo's checklist.
type SubtaskItem struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Done  bool   `json:"done"`
}

// TodoResponse is the JSON representation of a todo sent to the client.
// It converts pgtype nullable fields to plain Go nullable types so the
// JSON output is clean (strings, numbers, nulls — no nested structs).
type TodoResponse struct {
	ID                uuid.UUID     `json:"id"`
	UserID            uuid.UUID     `json:"user_id"`
	CategoryID        *uuid.UUID    `json:"category_id"`
	Title             string        `json:"title"`
	Description       *string       `json:"description"`
	Deadline          *string       `json:"deadline"`    // "YYYY-MM-DD"
	ReminderAt        *time.Time    `json:"reminder_at"` // RFC3339
	Priority          int16         `json:"priority"`
	Status            db.TodoStatus `json:"status"`
	SnoozeUntil       *string       `json:"snooze_until"` // "YYYY-MM-DD"
	DoneAt            *time.Time    `json:"done_at"`
	CreatedAt         time.Time     `json:"created_at"`
	UpdatedAt         time.Time     `json:"updated_at"`
	DurationMinutes   *int32        `json:"duration_minutes"`
	Subtasks          []SubtaskItem `json:"subtasks"`
	RecurrenceRule    *string       `json:"recurrence_rule"`
	RecurrenceEndDate *string       `json:"recurrence_end_date"`
}

func toTodoResponse(t *db.Todo) TodoResponse {
	r := TodoResponse{
		ID:        uuid.UUID(t.ID.Bytes),
		UserID:    uuid.UUID(t.UserID.Bytes),
		Title:     t.Title,
		Priority:  t.Priority,
		Status:    t.Status,
		CreatedAt: t.CreatedAt.Time,
		UpdatedAt: t.UpdatedAt.Time,
		Subtasks:  []SubtaskItem{},
	}

	if t.CategoryID.Valid {
		catID := uuid.UUID(t.CategoryID.Bytes)
		r.CategoryID = &catID
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
	if t.DurationMinutes.Valid {
		dm := t.DurationMinutes.Int32
		r.DurationMinutes = &dm
	}
	if len(t.Subtasks) > 0 {
		_ = json.Unmarshal(t.Subtasks, &r.Subtasks)
		if r.Subtasks == nil {
			r.Subtasks = []SubtaskItem{}
		}
	}
	if t.RecurrenceRule.Valid {
		r.RecurrenceRule = &t.RecurrenceRule.String
	}
	if t.RecurrenceEndDate.Valid {
		s := t.RecurrenceEndDate.Time.Format("2006-01-02")
		r.RecurrenceEndDate = &s
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

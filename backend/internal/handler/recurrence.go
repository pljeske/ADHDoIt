package handler

import (
	"context"
	"time"

	"adhdoit/internal/db"

	"github.com/jackc/pgx/v5/pgtype"
)

// computeNextDeadline shifts a todo's deadline forward by one recurrence unit.
// For "weekdays", Saturday and Sunday are skipped so the next occurrence always
// lands on a Monday–Friday.
func computeNextDeadline(current pgtype.Date, rule string) time.Time {
	base := current.Time
	var next time.Time
	switch rule {
	case "daily":
		next = base.AddDate(0, 0, 1)
	case "weekdays":
		next = base.AddDate(0, 0, 1)
		for next.Weekday() == time.Saturday || next.Weekday() == time.Sunday {
			next = next.AddDate(0, 0, 1)
		}
	case "weekly":
		next = base.AddDate(0, 0, 7)
	case "monthly":
		next = base.AddDate(0, 1, 0)
	default:
		next = base.AddDate(0, 0, 1)
	}
	return next
}

// isPastEndDate returns true when next falls strictly after endDate.
// If endDate is not set (not valid), the recurrence continues indefinitely.
func isPastEndDate(next time.Time, endDate pgtype.Date) bool {
	if !endDate.Valid {
		return false
	}
	// Truncate both to date precision for comparison.
	return next.After(endDate.Time.AddDate(0, 0, 0))
}

// spawnRecurringTodo inserts the next occurrence of a recurring todo using an
// already-open transaction-scoped Queries. If the source todo has a reminder,
// it is shifted by the same delta as the deadline so the time-of-day is preserved
// (e.g. a 9 AM reminder on a daily todo stays at 9 AM on the next day).
// Returns the newly created todo so the caller can schedule the River job.
func spawnRecurringTodo(ctx context.Context, qtx *db.Queries, source *db.Todo, nextDeadline time.Time) (*db.Todo, error) {
	subtasks := source.Subtasks
	if len(subtasks) == 0 {
		subtasks = []byte("[]")
	}

	var reminderAt pgtype.Timestamptz
	if source.ReminderAt.Valid {
		delta := nextDeadline.Sub(source.Deadline.Time)
		reminderAt = pgtype.Timestamptz{Time: source.ReminderAt.Time.Add(delta), Valid: true}
	}

	return qtx.CreateTodoFromRecurrence(ctx, &db.CreateTodoFromRecurrenceParams{
		UserID:            source.UserID,
		CategoryID:        source.CategoryID,
		Title:             source.Title,
		Description:       source.Description,
		Deadline:          pgtype.Date{Time: nextDeadline, Valid: true},
		ReminderAt:        reminderAt,
		Priority:          source.Priority,
		DurationMinutes:   source.DurationMinutes,
		Subtasks:          subtasks,
		RecurrenceRule:    source.RecurrenceRule,
		RecurrenceEndDate: source.RecurrenceEndDate,
	})
}

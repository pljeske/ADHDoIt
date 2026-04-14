package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"adhdoit/internal/config"
	"adhdoit/internal/db"
	mw "adhdoit/internal/middleware"
	"adhdoit/internal/worker"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
)

type TodoHandler struct {
	q     *db.Queries
	pool  *pgxpool.Pool
	river *river.Client[pgx.Tx]
	cfg   *config.Config
	v     *validator.Validate
}

func NewTodoHandler(q *db.Queries, pool *pgxpool.Pool, riverClient *river.Client[pgx.Tx], cfg *config.Config) *TodoHandler {
	return &TodoHandler{q: q, pool: pool, river: riverClient, cfg: cfg, v: validator.New()}
}

type createTodoRequest struct {
	Title             string        `json:"title" validate:"required,min=1"`
	Description       *string       `json:"description"`
	CategoryID        *string       `json:"category_id"`
	Deadline          *string       `json:"deadline"` // YYYY-MM-DD
	Priority          *int16        `json:"priority"`
	ReminderAt        *string       `json:"reminder_at"` // RFC3339
	DurationMinutes   *int32        `json:"duration_minutes"`
	Subtasks          []SubtaskItem `json:"subtasks"`
	RecurrenceRule    *string       `json:"recurrence_rule"`     // "daily"|"weekdays"|"weekly"|"monthly"
	RecurrenceEndDate *string       `json:"recurrence_end_date"` // YYYY-MM-DD
}

type updateTodoRequest struct {
	Title             *string        `json:"title"`
	Description       *string        `json:"description"`
	CategoryID        *string        `json:"category_id"`
	Deadline          *string        `json:"deadline"`
	Priority          *int16         `json:"priority"`
	ReminderAt        *string        `json:"reminder_at"`
	DurationMinutes   *int32         `json:"duration_minutes"`
	Subtasks          *[]SubtaskItem `json:"subtasks"`
	RecurrenceRule    *string        `json:"recurrence_rule"`
	RecurrenceEndDate *string        `json:"recurrence_end_date"`
}

func (h *TodoHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, _ := mw.UserIDFromContext(r.Context())
	uid := toPgtypeUUID(userID)

	user, err := h.q.GetUserByID(r.Context(), uid)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}

	view := r.URL.Query().Get("view")
	if view == "" {
		view = "today"
	}
	catIDStr := r.URL.Query().Get("category_id")

	var todos []*db.Todo
	switch view {
	case "today":
		todos, err = h.q.ListTodosToday(r.Context(), &db.ListTodosTodayParams{UserID: uid, Timezone: user.Timezone})
	case "upcoming":
		todos, err = h.q.ListTodosUpcoming(r.Context(), &db.ListTodosUpcomingParams{UserID: uid, Timezone: user.Timezone})
	case "overdue":
		todos, err = h.q.ListTodosOverdue(r.Context(), &db.ListTodosOverdueParams{UserID: uid, Timezone: user.Timezone})
	case "done":
		todos, err = h.q.ListTodosDone(r.Context(), uid)
	case "category":
		if catIDStr == "" {
			respondError(w, http.StatusBadRequest, "category_id required", "BAD_REQUEST")
			return
		}
		catID, parseErr := uuid.Parse(catIDStr)
		if parseErr != nil {
			respondError(w, http.StatusBadRequest, "invalid category_id", "BAD_REQUEST")
			return
		}
		todos, err = h.q.ListTodosByCategory(r.Context(), &db.ListTodosByCategoryParams{
			UserID:     uid,
			CategoryID: toPgtypeUUID(catID),
		})
	default:
		respondError(w, http.StatusBadRequest, "invalid view", "BAD_REQUEST")
		return
	}

	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}
	respondJSON(w, http.StatusOK, toTodoResponses(todos))
}

func (h *TodoHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, _ := mw.UserIDFromContext(r.Context())
	uid := toPgtypeUUID(userID)

	user, err := h.q.GetUserByID(r.Context(), uid)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}

	var req createTodoRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json", "BAD_REQUEST")
		return
	}
	if err := h.v.Struct(req); err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error(), "VALIDATION_ERROR")
		return
	}

	params := &db.CreateTodoParams{
		UserID:   uid,
		Title:    req.Title,
		Priority: 0,
		Subtasks: []byte("[]"),
	}

	if req.Description != nil {
		params.Description = pgtype.Text{String: *req.Description, Valid: true}
	}
	if req.CategoryID != nil {
		catID, err := uuid.Parse(*req.CategoryID)
		if err == nil {
			params.CategoryID = toPgtypeUUID(catID)
		}
	}
	if req.Priority != nil {
		params.Priority = *req.Priority
	}

	// Deadline defaults to today in user's timezone
	if req.Deadline != nil {
		t, err := time.Parse("2006-01-02", *req.Deadline)
		if err == nil {
			params.Deadline = pgtype.Date{Time: t, Valid: true}
		}
	} else {
		loc, _ := time.LoadLocation(user.Timezone)
		today := time.Now().In(loc)
		params.Deadline = pgtype.Date{Time: today, Valid: true}
	}

	if req.ReminderAt != nil {
		t, err := time.Parse(time.RFC3339, *req.ReminderAt)
		if err == nil {
			params.ReminderAt = pgtype.Timestamptz{Time: t, Valid: true}
		}
	}
	if req.DurationMinutes != nil && *req.DurationMinutes > 0 {
		params.DurationMinutes = pgtype.Int4{Int32: *req.DurationMinutes, Valid: true}
	}
	if req.Subtasks != nil {
		if data, err := json.Marshal(req.Subtasks); err == nil {
			params.Subtasks = data
		}
	}
	if req.RecurrenceRule != nil {
		switch *req.RecurrenceRule {
		case "daily", "weekdays", "weekly", "monthly":
			params.RecurrenceRule = pgtype.Text{String: *req.RecurrenceRule, Valid: true}
		default:
			respondError(w, http.StatusUnprocessableEntity, "recurrence_rule must be one of: daily, weekdays, weekly, monthly", "VALIDATION_ERROR")
			return
		}
	}
	if req.RecurrenceEndDate != nil {
		t, err := time.Parse("2006-01-02", *req.RecurrenceEndDate)
		if err == nil {
			params.RecurrenceEndDate = pgtype.Date{Time: t, Valid: true}
		}
	}

	todo, err := h.q.CreateTodo(r.Context(), params)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}

	// Schedule reminder job if needed
	if todo.ReminderAt.Valid && h.river != nil {
		h.scheduleReminder(r.Context(), todo)
	}

	respondJSON(w, http.StatusCreated, toTodoResponse(todo))
}

func (h *TodoHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, _ := mw.UserIDFromContext(r.Context())
	id, err := parseTodoID(r)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid id", "BAD_REQUEST")
		return
	}

	todo, err := h.q.GetTodo(r.Context(), &db.GetTodoParams{ID: id, UserID: toPgtypeUUID(userID)})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respondError(w, http.StatusNotFound, "todo not found", "NOT_FOUND")
			return
		}
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}
	respondJSON(w, http.StatusOK, toTodoResponse(todo))
}

func (h *TodoHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, _ := mw.UserIDFromContext(r.Context())
	id, err := parseTodoID(r)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid id", "BAD_REQUEST")
		return
	}

	existing, err := h.q.GetTodo(r.Context(), &db.GetTodoParams{ID: id, UserID: toPgtypeUUID(userID)})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respondError(w, http.StatusNotFound, "todo not found", "NOT_FOUND")
			return
		}
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}

	var req updateTodoRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json", "BAD_REQUEST")
		return
	}

	params := &db.UpdateTodoParams{
		ID:                existing.ID,
		UserID:            existing.UserID,
		CategoryID:        existing.CategoryID,
		Title:             existing.Title,
		Description:       existing.Description,
		Deadline:          existing.Deadline,
		ReminderAt:        existing.ReminderAt,
		ReminderJobID:     existing.ReminderJobID,
		Priority:          existing.Priority,
		DurationMinutes:   existing.DurationMinutes,
		Subtasks:          existing.Subtasks,
		RecurrenceRule:    existing.RecurrenceRule,
		RecurrenceEndDate: existing.RecurrenceEndDate,
	}

	if req.Title != nil {
		params.Title = *req.Title
	}
	if req.Description != nil {
		params.Description = pgtype.Text{String: *req.Description, Valid: true}
	}
	if req.CategoryID != nil {
		if *req.CategoryID == "" {
			params.CategoryID = pgtype.UUID{}
		} else {
			catID, parseErr := uuid.Parse(*req.CategoryID)
			if parseErr == nil {
				params.CategoryID = toPgtypeUUID(catID)
			}
		}
	}
	if req.Priority != nil {
		params.Priority = *req.Priority
	}
	if req.Deadline != nil {
		t, err := time.Parse("2006-01-02", *req.Deadline)
		if err == nil {
			params.Deadline = pgtype.Date{Time: t, Valid: true}
		}
	}

	if req.DurationMinutes != nil {
		if *req.DurationMinutes > 0 {
			params.DurationMinutes = pgtype.Int4{Int32: *req.DurationMinutes, Valid: true}
		} else {
			params.DurationMinutes = pgtype.Int4{}
		}
	}
	if req.Subtasks != nil {
		if data, err := json.Marshal(*req.Subtasks); err == nil {
			params.Subtasks = data
		}
	}
	if req.RecurrenceRule != nil {
		if *req.RecurrenceRule == "" {
			params.RecurrenceRule = pgtype.Text{}
		} else {
			switch *req.RecurrenceRule {
			case "daily", "weekdays", "weekly", "monthly":
				params.RecurrenceRule = pgtype.Text{String: *req.RecurrenceRule, Valid: true}
			default:
				respondError(w, http.StatusUnprocessableEntity, "recurrence_rule must be one of: daily, weekdays, weekly, monthly", "VALIDATION_ERROR")
				return
			}
		}
	}
	if req.RecurrenceEndDate != nil {
		if *req.RecurrenceEndDate == "" {
			params.RecurrenceEndDate = pgtype.Date{}
		} else {
			t, err := time.Parse("2006-01-02", *req.RecurrenceEndDate)
			if err == nil {
				params.RecurrenceEndDate = pgtype.Date{Time: t, Valid: true}
			}
		}
	}

	reminderChanged := false
	if req.ReminderAt != nil {
		reminderChanged = true
		if *req.ReminderAt == "" {
			params.ReminderAt = pgtype.Timestamptz{}
		} else {
			t, err := time.Parse(time.RFC3339, *req.ReminderAt)
			if err == nil {
				params.ReminderAt = pgtype.Timestamptz{Time: t, Valid: true}
			}
		}
	}

	// Cancel existing reminder job if reminder changed
	if reminderChanged && existing.ReminderJobID.Valid && h.river != nil {
		if _, err := h.river.JobCancel(r.Context(), existing.ReminderJobID.Int64); err != nil {
			slog.Warn("failed to cancel reminder job", "job_id", existing.ReminderJobID.Int64, "err", err)
		}
		params.ReminderJobID = pgtype.Int8{}
	}

	todo, err := h.q.UpdateTodo(r.Context(), params)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}

	// Schedule new reminder if needed
	if reminderChanged && todo.ReminderAt.Valid && h.river != nil {
		h.scheduleReminder(r.Context(), todo)
	}

	respondJSON(w, http.StatusOK, toTodoResponse(todo))
}

func (h *TodoHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, _ := mw.UserIDFromContext(r.Context())
	uid := toPgtypeUUID(userID)
	id, err := parseTodoID(r)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid id", "BAD_REQUEST")
		return
	}

	existing, err := h.q.GetTodo(r.Context(), &db.GetTodoParams{ID: id, UserID: uid})
	if err == nil && existing.ReminderJobID.Valid && h.river != nil {
		if _, err := h.river.JobCancel(r.Context(), existing.ReminderJobID.Int64); err != nil {
			slog.Warn("failed to cancel reminder job on delete", "err", err)
		}
	}

	if err := h.q.DeleteTodo(r.Context(), &db.DeleteTodoParams{ID: id, UserID: uid}); err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *TodoHandler) Snooze(w http.ResponseWriter, r *http.Request) {
	userID, _ := mw.UserIDFromContext(r.Context())
	id, err := parseTodoID(r)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid id", "BAD_REQUEST")
		return
	}

	var req struct {
		SnoozeUntil string `json:"snooze_until" validate:"required"`
	}
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json", "BAD_REQUEST")
		return
	}
	if err := h.v.Struct(req); err != nil {
		respondError(w, http.StatusUnprocessableEntity, err.Error(), "VALIDATION_ERROR")
		return
	}

	t, err := time.Parse("2006-01-02", req.SnoozeUntil)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid snooze_until date", "BAD_REQUEST")
		return
	}

	todo, err := h.q.SnoozeTodo(r.Context(), &db.SnoozeTodoParams{
		ID:       id,
		UserID:   toPgtypeUUID(userID),
		Deadline: pgtype.Date{Time: t, Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respondError(w, http.StatusNotFound, "todo not found", "NOT_FOUND")
			return
		}
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}
	respondJSON(w, http.StatusOK, toTodoResponse(todo))
}

func (h *TodoHandler) Done(w http.ResponseWriter, r *http.Request) {
	userID, _ := mw.UserIDFromContext(r.Context())
	uid := toPgtypeUUID(userID)
	id, err := parseTodoID(r)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid id", "BAD_REQUEST")
		return
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}
	defer tx.Rollback(r.Context())

	qtx := db.New(tx)
	todo, err := qtx.SetTodoDone(r.Context(), &db.SetTodoDoneParams{ID: id, UserID: uid})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respondError(w, http.StatusNotFound, "todo not found", "NOT_FOUND")
			return
		}
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}

	var spawnedTodo *db.Todo
	if todo.RecurrenceRule.Valid {
		nextDeadline := computeNextDeadline(todo.Deadline, todo.RecurrenceRule.String)
		if !isPastEndDate(nextDeadline, todo.RecurrenceEndDate) {
			spawnedTodo, err = spawnRecurringTodo(r.Context(), qtx, todo, nextDeadline)
			if err != nil {
				slog.Warn("failed to spawn recurring todo", "todo_id", id, "err", err)
				spawnedTodo = nil
			}
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}

	if spawnedTodo != nil && spawnedTodo.ReminderAt.Valid && h.river != nil {
		h.scheduleReminder(r.Context(), spawnedTodo)
	}

	respondJSON(w, http.StatusOK, toTodoResponse(todo))
}

func (h *TodoHandler) Reopen(w http.ResponseWriter, r *http.Request) {
	userID, _ := mw.UserIDFromContext(r.Context())
	id, err := parseTodoID(r)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid id", "BAD_REQUEST")
		return
	}

	todo, err := h.q.ReopenTodo(r.Context(), &db.ReopenTodoParams{ID: id, UserID: toPgtypeUUID(userID)})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respondError(w, http.StatusNotFound, "todo not found", "NOT_FOUND")
			return
		}
		respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
		return
	}
	respondJSON(w, http.StatusOK, toTodoResponse(todo))
}

func (h *TodoHandler) scheduleReminder(ctx context.Context, todo *db.Todo) {
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		slog.Warn("failed to begin tx for reminder", "err", err)
		return
	}
	defer tx.Rollback(ctx)

	res, err := h.river.InsertTx(ctx, tx, worker.ReminderArgs{
		TodoID: todo.ID.String(),
		UserID: todo.UserID.String(),
	}, &river.InsertOpts{
		ScheduledAt: todo.ReminderAt.Time,
	})
	if err != nil {
		slog.Warn("failed to enqueue reminder", "err", err)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		slog.Warn("failed to commit reminder tx", "err", err)
		return
	}

	// Update job ID on the todo
	updateParams := &db.UpdateTodoParams{
		ID:                todo.ID,
		UserID:            todo.UserID,
		CategoryID:        todo.CategoryID,
		Title:             todo.Title,
		Description:       todo.Description,
		Deadline:          todo.Deadline,
		ReminderAt:        todo.ReminderAt,
		ReminderJobID:     pgtype.Int8{Int64: res.Job.ID, Valid: true},
		Priority:          todo.Priority,
		DurationMinutes:   todo.DurationMinutes,
		Subtasks:          todo.Subtasks,
		RecurrenceRule:    todo.RecurrenceRule,
		RecurrenceEndDate: todo.RecurrenceEndDate,
	}
	if _, err := h.q.UpdateTodo(ctx, updateParams); err != nil {
		slog.Warn("failed to store reminder job id", "err", err)
	}
}

// parseTodoID parses the "id" URL param as a pgtype.UUID.
func parseTodoID(r *http.Request) (pgtype.UUID, error) {
	raw, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		return pgtype.UUID{}, err
	}
	return toPgtypeUUID(raw), nil
}

// toPgtypeUUID converts a google/uuid.UUID to a pgtype.UUID.
func toPgtypeUUID(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

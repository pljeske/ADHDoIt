package worker

import (
	"context"
	"errors"
	"log/slog"

	"adhdoit/internal/config"
	"adhdoit/internal/db"
	"adhdoit/internal/notification"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/riverqueue/river"
)

type ReminderArgs struct {
	TodoID string `json:"todo_id"`
	UserID string `json:"user_id"`
}

func (ReminderArgs) Kind() string { return "reminder" }

type ReminderWorker struct {
	river.WorkerDefaults[ReminderArgs]
	q   *db.Queries
	cfg *config.Config
}

func NewReminderWorker(q *db.Queries, cfg *config.Config) *ReminderWorker {
	return &ReminderWorker{q: q, cfg: cfg}
}

func (w *ReminderWorker) Work(ctx context.Context, job *river.Job[ReminderArgs]) error {
	todoID, err := uuid.Parse(job.Args.TodoID)
	if err != nil {
		return nil // bad ID, discard
	}
	userID, err := uuid.Parse(job.Args.UserID)
	if err != nil {
		return nil
	}

	todo, err := w.q.GetTodo(ctx, todoID, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil // todo deleted, skip
		}
		return err
	}
	if todo.Status == db.TodoStatusDone {
		return nil // already done, skip
	}

	user, err := w.q.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}

	subs, err := w.q.ListPushSubscriptionsByUser(ctx, userID)
	if err != nil {
		slog.Warn("failed to fetch push subscriptions", "err", err)
	}

	// Send notifications concurrently but don't fail the job if one channel fails
	errCh := make(chan error, 1+len(subs))

	go func() {
		if err := notification.SendReminderEmail(w.cfg, user.Email, user.Name, todo.Title); err != nil {
			slog.Warn("email reminder failed", "err", err)
		}
		errCh <- nil
	}()

	for _, sub := range subs {
		sub := sub
		go func() {
			if err := notification.SendWebPush(w.cfg, sub, todo.Title); err != nil {
				slog.Warn("web push failed", "err", err, "endpoint", sub.Endpoint)
			}
			errCh <- nil
		}()
	}

	// Wait for all goroutines
	for i := 0; i < 1+len(subs); i++ {
		<-errCh
	}

	slog.Info("reminder dispatched", "todo_id", todoID, "user_id", userID)
	return nil
}

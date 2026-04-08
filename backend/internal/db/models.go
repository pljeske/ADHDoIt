package db

import (
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type TodoStatus string

const (
	TodoStatusActive  TodoStatus = "active"
	TodoStatusSnoozed TodoStatus = "snoozed"
	TodoStatusDone    TodoStatus = "done"
)

type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	Timezone     string    `json:"timezone"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type RefreshToken struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	TokenHash string    `json:"-"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

type Category struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	CreatedAt time.Time `json:"created_at"`
}

type Todo struct {
	ID            uuid.UUID          `json:"id"`
	UserID        uuid.UUID          `json:"user_id"`
	CategoryID    pgtype.UUID        `json:"category_id"`
	Title         string             `json:"title"`
	Description   pgtype.Text        `json:"description"`
	Deadline      pgtype.Date        `json:"deadline"`
	ReminderAt    pgtype.Timestamptz `json:"reminder_at"`
	ReminderJobID pgtype.Int8        `json:"reminder_job_id"`
	Priority      int16              `json:"priority"`
	Status        TodoStatus         `json:"status"`
	SnoozeUntil   pgtype.Date        `json:"snooze_until"`
	DoneAt        pgtype.Timestamptz `json:"done_at"`
	CreatedAt     time.Time          `json:"created_at"`
	UpdatedAt     time.Time          `json:"updated_at"`
}

type PushSubscription struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Endpoint  string    `json:"endpoint"`
	P256dh    string    `json:"p256dh"`
	Auth      string    `json:"auth"`
	CreatedAt time.Time `json:"created_at"`
}

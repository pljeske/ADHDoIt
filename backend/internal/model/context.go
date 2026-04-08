package model

import "github.com/google/uuid"

type contextKey string

const (
	ContextKeyUserID    contextKey = "user_id"
	ContextKeyUserEmail contextKey = "user_email"
)

type Claims struct {
	UserID uuid.UUID
	Email  string
}

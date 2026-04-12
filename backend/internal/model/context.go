package model

import "github.com/google/uuid"

type contextKey string

const (
	ContextKeyUserID    contextKey = "user_id"
	ContextKeyUserEmail contextKey = "user_email"
	ContextKeyUserRole  contextKey = "user_role"
)

type Claims struct {
	UserID uuid.UUID
	Email  string
	Role   string
}

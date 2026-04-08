package db

import (
	"context"

	"github.com/google/uuid"
)

const createUser = `
INSERT INTO users (email, password_hash, name, timezone)
VALUES ($1, $2, $3, $4)
RETURNING id, email, password_hash, name, timezone, created_at, updated_at
`

func (q *Queries) CreateUser(ctx context.Context, email, passwordHash, name, timezone string) (*User, error) {
	row := q.db.QueryRow(ctx, createUser, email, passwordHash, name, timezone)
	var u User
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Timezone, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

const getUserByEmail = `
SELECT id, email, password_hash, name, timezone, created_at, updated_at
FROM users WHERE email = $1
`

func (q *Queries) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	row := q.db.QueryRow(ctx, getUserByEmail, email)
	var u User
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Timezone, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

const getUserByID = `
SELECT id, email, password_hash, name, timezone, created_at, updated_at
FROM users WHERE id = $1
`

func (q *Queries) GetUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
	row := q.db.QueryRow(ctx, getUserByID, id)
	var u User
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Timezone, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

const updateUserTimezone = `
UPDATE users SET timezone = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, email, password_hash, name, timezone, created_at, updated_at
`

func (q *Queries) UpdateUserTimezone(ctx context.Context, id uuid.UUID, timezone string) (*User, error) {
	row := q.db.QueryRow(ctx, updateUserTimezone, id, timezone)
	var u User
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Timezone, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

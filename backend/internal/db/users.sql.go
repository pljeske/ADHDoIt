package db

import (
	"context"

	"github.com/google/uuid"
)

const createUser = `
INSERT INTO users (email, password_hash, name, timezone)
VALUES ($1, $2, $3, $4)
RETURNING id, email, password_hash, name, timezone, role, created_at, updated_at
`

func (q *Queries) CreateUser(ctx context.Context, email, passwordHash, name, timezone string) (*User, error) {
	row := q.db.QueryRow(ctx, createUser, email, passwordHash, name, timezone)
	var u User
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Timezone, &u.Role, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

const getUserByEmail = `
SELECT id, email, password_hash, name, timezone, role, created_at, updated_at
FROM users WHERE email = $1
`

func (q *Queries) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	row := q.db.QueryRow(ctx, getUserByEmail, email)
	var u User
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Timezone, &u.Role, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

const getUserByID = `
SELECT id, email, password_hash, name, timezone, role, created_at, updated_at
FROM users WHERE id = $1
`

func (q *Queries) GetUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
	row := q.db.QueryRow(ctx, getUserByID, id)
	var u User
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Timezone, &u.Role, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

const updateUserTimezone = `
UPDATE users SET timezone = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, email, password_hash, name, timezone, role, created_at, updated_at
`

func (q *Queries) UpdateUserTimezone(ctx context.Context, id uuid.UUID, timezone string) (*User, error) {
	row := q.db.QueryRow(ctx, updateUserTimezone, id, timezone)
	var u User
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Timezone, &u.Role, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

const listUsers = `
SELECT id, email, password_hash, name, timezone, role, created_at, updated_at
FROM users
ORDER BY created_at ASC
`

func (q *Queries) ListUsers(ctx context.Context) ([]*User, error) {
	rows, err := q.db.Query(ctx, listUsers)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var users []*User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Timezone, &u.Role, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, &u)
	}
	return users, rows.Err()
}

const updateUserRole = `
UPDATE users SET role = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, email, password_hash, name, timezone, role, created_at, updated_at
`

func (q *Queries) UpdateUserRole(ctx context.Context, id uuid.UUID, role string) (*User, error) {
	row := q.db.QueryRow(ctx, updateUserRole, id, role)
	var u User
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Timezone, &u.Role, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

const deleteUser = `DELETE FROM users WHERE id = $1`

func (q *Queries) DeleteUser(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, deleteUser, id)
	return err
}

const getAppSetting = `SELECT value FROM app_settings WHERE key = $1`

func (q *Queries) GetAppSetting(ctx context.Context, key string) (string, error) {
	row := q.db.QueryRow(ctx, getAppSetting, key)
	var value string
	return value, row.Scan(&value)
}

const setAppSetting = `
INSERT INTO app_settings (key, value) VALUES ($1, $2)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
`

func (q *Queries) SetAppSetting(ctx context.Context, key, value string) error {
	_, err := q.db.Exec(ctx, setAppSetting, key, value)
	return err
}

-- name: CreateUser :one
INSERT INTO users (email, password_hash, name, timezone)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: UpdateUserTimezone :one
UPDATE users SET timezone = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

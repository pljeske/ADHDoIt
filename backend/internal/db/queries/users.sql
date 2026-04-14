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

-- name: CountUsers :one
SELECT COUNT(*) FROM users;

-- name: ListUsers :many
SELECT * FROM users ORDER BY created_at ASC;

-- name: SetUserRole :one
UPDATE users SET role = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateUserRole :one
UPDATE users SET role = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;

-- name: GetUserByOIDCSubject :one
SELECT id, email, password_hash, name, timezone, created_at, updated_at, role, oidc_subject
FROM users WHERE oidc_subject = $1;

-- name: CreateOIDCUser :one
INSERT INTO users (email, password_hash, name, timezone, oidc_subject)
VALUES ($1, '', $2, $3, $4)
RETURNING id, email, password_hash, name, timezone, created_at, updated_at, role, oidc_subject;

-- name: LinkOIDCSubject :one
UPDATE users SET oidc_subject = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, email, password_hash, name, timezone, created_at, updated_at, role, oidc_subject;

package db

import (
	"context"
	"time"

	"github.com/google/uuid"
)

const createRefreshToken = `
INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
VALUES ($1, $2, $3)
RETURNING id, user_id, token_hash, expires_at, created_at
`

func (q *Queries) CreateRefreshToken(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) (*RefreshToken, error) {
	row := q.db.QueryRow(ctx, createRefreshToken, userID, tokenHash, expiresAt)
	var rt RefreshToken
	err := row.Scan(&rt.ID, &rt.UserID, &rt.TokenHash, &rt.ExpiresAt, &rt.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &rt, nil
}

const getRefreshToken = `
SELECT id, user_id, token_hash, expires_at, created_at
FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()
`

func (q *Queries) GetRefreshToken(ctx context.Context, tokenHash string) (*RefreshToken, error) {
	row := q.db.QueryRow(ctx, getRefreshToken, tokenHash)
	var rt RefreshToken
	err := row.Scan(&rt.ID, &rt.UserID, &rt.TokenHash, &rt.ExpiresAt, &rt.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &rt, nil
}

const deleteRefreshToken = `DELETE FROM refresh_tokens WHERE token_hash = $1`

func (q *Queries) DeleteRefreshToken(ctx context.Context, tokenHash string) error {
	_, err := q.db.Exec(ctx, deleteRefreshToken, tokenHash)
	return err
}

const deleteExpiredRefreshTokens = `DELETE FROM refresh_tokens WHERE expires_at < NOW()`

func (q *Queries) DeleteExpiredRefreshTokens(ctx context.Context) error {
	_, err := q.db.Exec(ctx, deleteExpiredRefreshTokens)
	return err
}

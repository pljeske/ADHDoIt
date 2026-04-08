package db

import (
	"context"

	"github.com/google/uuid"
)

const upsertPushSubscription = `
INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
VALUES ($1, $2, $3, $4)
ON CONFLICT (endpoint) DO UPDATE
    SET p256dh  = EXCLUDED.p256dh,
        auth    = EXCLUDED.auth,
        user_id = EXCLUDED.user_id
RETURNING id, user_id, endpoint, p256dh, auth, created_at
`

func (q *Queries) UpsertPushSubscription(ctx context.Context, userID uuid.UUID, endpoint, p256dh, auth string) (*PushSubscription, error) {
	row := q.db.QueryRow(ctx, upsertPushSubscription, userID, endpoint, p256dh, auth)
	var ps PushSubscription
	err := row.Scan(&ps.ID, &ps.UserID, &ps.Endpoint, &ps.P256dh, &ps.Auth, &ps.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &ps, nil
}

const listPushSubscriptionsByUser = `
SELECT id, user_id, endpoint, p256dh, auth, created_at
FROM push_subscriptions WHERE user_id = $1
`

func (q *Queries) ListPushSubscriptionsByUser(ctx context.Context, userID uuid.UUID) ([]*PushSubscription, error) {
	rows, err := q.db.Query(ctx, listPushSubscriptionsByUser, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var subs []*PushSubscription
	for rows.Next() {
		var ps PushSubscription
		if err := rows.Scan(&ps.ID, &ps.UserID, &ps.Endpoint, &ps.P256dh, &ps.Auth, &ps.CreatedAt); err != nil {
			return nil, err
		}
		subs = append(subs, &ps)
	}
	return subs, rows.Err()
}

const deletePushSubscription = `
DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2
`

func (q *Queries) DeletePushSubscription(ctx context.Context, endpoint string, userID uuid.UUID) error {
	_, err := q.db.Exec(ctx, deletePushSubscription, endpoint, userID)
	return err
}

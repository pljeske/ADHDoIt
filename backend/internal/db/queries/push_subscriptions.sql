-- name: UpsertPushSubscription :one
INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
VALUES ($1, $2, $3, $4)
ON CONFLICT (endpoint) DO UPDATE
    SET p256dh = EXCLUDED.p256dh,
        auth   = EXCLUDED.auth,
        user_id = EXCLUDED.user_id
RETURNING *;

-- name: ListPushSubscriptionsByUser :many
SELECT * FROM push_subscriptions WHERE user_id = $1;

-- name: DeletePushSubscription :exec
DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2;

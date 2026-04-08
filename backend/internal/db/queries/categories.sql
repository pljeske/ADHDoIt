-- name: CreateCategory :one
INSERT INTO categories (user_id, name, color)
VALUES ($1, $2, $3)
RETURNING *;

-- name: ListCategories :many
SELECT * FROM categories WHERE user_id = $1 ORDER BY name ASC;

-- name: GetCategory :one
SELECT * FROM categories WHERE id = $1 AND user_id = $2;

-- name: UpdateCategory :one
UPDATE categories SET name = $3, color = $4
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: DeleteCategory :exec
DELETE FROM categories WHERE id = $1 AND user_id = $2;

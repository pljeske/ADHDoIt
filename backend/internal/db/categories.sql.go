package db

import (
	"context"

	"github.com/google/uuid"
)

const createCategory = `
INSERT INTO categories (user_id, name, color)
VALUES ($1, $2, $3)
RETURNING id, user_id, name, color, created_at
`

func (q *Queries) CreateCategory(ctx context.Context, userID uuid.UUID, name, color string) (*Category, error) {
	row := q.db.QueryRow(ctx, createCategory, userID, name, color)
	var c Category
	err := row.Scan(&c.ID, &c.UserID, &c.Name, &c.Color, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

const listCategories = `
SELECT id, user_id, name, color, created_at
FROM categories WHERE user_id = $1 ORDER BY name ASC
`

func (q *Queries) ListCategories(ctx context.Context, userID uuid.UUID) ([]*Category, error) {
	rows, err := q.db.Query(ctx, listCategories, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var cats []*Category
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.UserID, &c.Name, &c.Color, &c.CreatedAt); err != nil {
			return nil, err
		}
		cats = append(cats, &c)
	}
	return cats, rows.Err()
}

const getCategory = `
SELECT id, user_id, name, color, created_at
FROM categories WHERE id = $1 AND user_id = $2
`

func (q *Queries) GetCategory(ctx context.Context, id, userID uuid.UUID) (*Category, error) {
	row := q.db.QueryRow(ctx, getCategory, id, userID)
	var c Category
	err := row.Scan(&c.ID, &c.UserID, &c.Name, &c.Color, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

const updateCategory = `
UPDATE categories SET name = $3, color = $4
WHERE id = $1 AND user_id = $2
RETURNING id, user_id, name, color, created_at
`

func (q *Queries) UpdateCategory(ctx context.Context, id, userID uuid.UUID, name, color string) (*Category, error) {
	row := q.db.QueryRow(ctx, updateCategory, id, userID, name, color)
	var c Category
	err := row.Scan(&c.ID, &c.UserID, &c.Name, &c.Color, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

const deleteCategory = `DELETE FROM categories WHERE id = $1 AND user_id = $2`

func (q *Queries) DeleteCategory(ctx context.Context, id, userID uuid.UUID) error {
	_, err := q.db.Exec(ctx, deleteCategory, id, userID)
	return err
}

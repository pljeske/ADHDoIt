---
name: db-schema-change
description: Adding or modifying a database column — migration file, sqlc query update, Go regen, handler wiring.
triggers:
  - "migration"
  - "schema change"
  - "add column"
  - "new column"
  - "alter table"
  - "sqlc generate"
  - "db schema"
  - "new field"
edges:
  - target: context/conventions.md
    condition: always — run the verify checklist after adding a field to a handler
  - target: patterns/add-endpoint.md
    condition: when the schema change powers a new endpoint
  - target: context/stack.md
    condition: when pgtype nullable handling is needed for the new column
last_updated: 2026-04-09
---

# DB Schema Change

## Context

Every new column follows the same pipeline: migration SQL → query SQL → `sqlc generate` → Go handler update. Skipping any step causes compile errors or silent zero-value bugs. Migration files run via golang-migrate at server startup.

## Steps

**1. Write the migration file** in `backend/internal/db/migrations/`

Files must be numbered sequentially: `000002_add_my_column.up.sql` / `000002_add_my_column.down.sql`.

```sql
-- 000002_add_my_column.up.sql
ALTER TABLE todos ADD COLUMN my_field TEXT;

-- 000002_add_my_column.down.sql
ALTER TABLE todos DROP COLUMN IF EXISTS my_field;
```

For nullable columns, no default is needed. For NOT NULL, provide a default or backfill first.

**2. Update the query SQL** in `backend/internal/db/queries/<resource>.sql`

Add the column to `SELECT` and any `INSERT`/`UPDATE` statements.

For `todos.sql`, the `allTodoCols` constant in `todos.sql.go` is manually maintained (not generated) — search for it and add your column there too:
```go
// backend/internal/db/todos.sql.go (manually maintained constant)
const allTodoCols = `id, user_id, ..., my_field`
```

**3. Regenerate sqlc**
```bash
cd backend/internal/db && sqlc generate
```

Fix any compilation errors. Check the generated `*Params` struct for your new field — if it's missing, the `.sql` query file didn't include it.

**4. Update the Go model** in `backend/internal/db/models.go`

The `Todo` struct (and other models) is **manually maintained** in `models.go` — sqlc does not generate it for this project. Add the field:
```go
type Todo struct {
    ...
    MyField pgtype.Text `json:"my_field"` // nullable
    // or
    MyField string      `json:"my_field"` // not null
}
```

**5. Update the handler** in `backend/internal/handler/<resource>.go`

Add the field to the request struct, assign it in the params struct, and include it in the response. Remember: every field in the request struct must be explicitly assigned to the params struct.

```go
type createTodoRequest struct {
    ...
    MyField *string `json:"my_field"`
}

// In the handler:
if req.MyField != nil {
    params.MyField = pgtype.Text{String: *req.MyField, Valid: true}
}
```

**6. Update the frontend** `src/api/todos.ts`

Add the field to the `Todo` interface and any create/update data interfaces:
```ts
export interface Todo {
  ...
  my_field: string | null
}

export interface CreateTodoData {
  ...
  my_field?: string | null
}
```

## Gotchas

- **`models.go` is manually maintained**: Unlike a pure sqlc project, `backend/internal/db/models.go` is hand-written and not regenerated. You must add new columns to it manually. If you forget, the generated scan function will fail to compile.
- **`allTodoCols` is manually maintained**: `todos.sql.go` defines `allTodoCols` as a Go string constant (not generated). Every column in the `todos` table must appear in this constant or `scanTodo` will miss it.
- **Missing field assignment = silent zero value**: If you add a field to the request struct but forget `params.MyField = req.MyField`, the DB record is written with the zero value. Go doesn't warn you.
- **pgtype for nullables**: Optional/nullable columns use `pgtype.*` wrappers (`pgtype.Text`, `pgtype.Int4`, `pgtype.UUID`, `pgtype.Date`, `pgtype.Timestamptz`). Assigning a plain Go type to these is a compile error.
- **Migration numbering**: Files must increment from the last migration number. Check existing files: `ls backend/internal/db/migrations/`.
- **Down migrations**: Always write the `.down.sql` file even if you never plan to run it. `golang-migrate` requires both.
- **Migration runs at startup**: You don't need to run migrations manually — `docker compose up` (or starting the Go server) runs them. But you do need to restart the server for new migrations to apply.

## Verify

- [ ] Migration files are numbered correctly (next in sequence)
- [ ] Both `.up.sql` and `.down.sql` exist
- [ ] New column added to `allTodoCols` constant in `todos.sql.go` (if it's a todos column)
- [ ] New field added to the `Todo` (or other model) struct in `models.go`
- [ ] `sqlc generate` ran without errors
- [ ] Every request field is assigned to the params struct in the handler
- [ ] pgtype wrapper used for nullable columns
- [ ] Frontend `Todo` interface updated to include the new field

## Debug

**`scanTodo` compile error after adding column**: The column is in `allTodoCols` but missing from the `Todo` struct in `models.go`, or vice versa.

**Column exists in DB but handler returns zero value**: The field is in the params struct but the assignment `params.MyField = req.MyField` is missing in the handler body.

**Migration fails on startup**: Check `docker compose logs app` — golang-migrate logs the failing SQL. Common causes: column already exists (used `ADD COLUMN` without `IF NOT EXISTS`), wrong migration number (gap or duplicate).

**`sqlc generate` fails**: Check the `.sql` query files for syntax errors. The `allTodoCols` constant must list columns in the same order they're scanned in `scanTodo`.

## Update Scaffold

- [ ] Update `.mex/ROUTER.md` "Current Project State" if the schema change is significant
- [ ] Update `context/architecture.md` if a new major model or resource was added
- [ ] If this is a new task type without a pattern, create one in `.mex/patterns/` and add to `INDEX.md`

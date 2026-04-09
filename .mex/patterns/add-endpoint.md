---
name: add-endpoint
description: Adding a new Go API endpoint — SQL query, sqlc generation, handler method, route registration.
triggers:
  - "add endpoint"
  - "new endpoint"
  - "new route"
  - "new API"
  - "add handler"
edges:
  - target: context/conventions.md
    condition: always — run the verify checklist after writing the handler
  - target: context/architecture.md
    condition: when the endpoint involves a new resource or changes the route structure
  - target: patterns/reminder-jobs.md
    condition: when the endpoint needs to schedule or cancel a River reminder job
  - target: patterns/db-schema-change.md
    condition: when the endpoint requires a new DB column or model field
last_updated: 2026-04-09
---

# Add Endpoint

## Context

Load `context/conventions.md` before starting. Every endpoint follows the same shape: SQL query → sqlc generate → handler method → route registration.

## Steps

**1. Write the SQL query** in `backend/internal/db/queries/<resource>.sql`
```sql
-- name: MyNewQuery :one
SELECT * FROM todos
WHERE id = $1 AND user_id = $2;
```
Naming: verb-first PascalCase matching the Go function name you want (e.g. `GetTodosWithCondition`).

**2. Regenerate sqlc**
```bash
cd backend/internal/db && sqlc generate
```
Fix any compile errors in the generated files before proceeding.

**3. Add the handler method** to `backend/internal/handler/<resource>.go`
```go
func (h *TodoHandler) MyAction(w http.ResponseWriter, r *http.Request) {
    // Always extract user ID from context — never from request body
    userID, _ := mw.UserIDFromContext(r.Context())

    // Decode + validate request
    var req myRequest
    if err := decodeJSON(r, &req); err != nil {
        respondError(w, http.StatusBadRequest, "invalid json", "BAD_REQUEST")
        return
    }
    if err := h.v.Struct(req); err != nil {
        respondError(w, http.StatusUnprocessableEntity, err.Error(), "VALIDATION_ERROR")
        return
    }

    // Build sqlc params — assign EVERY field from req to params
    params := &db.MyQueryParams{
        UserID: userID,
        Field:  req.Field, // don't miss any fields!
    }

    // Call sqlc query
    result, err := h.q.MyNewQuery(r.Context(), params)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            respondError(w, http.StatusNotFound, "not found", "NOT_FOUND")
            return
        }
        respondError(w, http.StatusInternalServerError, "internal error", "INTERNAL")
        return
    }

    respondJSON(w, http.StatusOK, result)
}
```

**4. Register the route** in `backend/internal/server/server.go`
```go
// Inside the authenticated r.Group:
r.Post("/todos/{id}/my-action", todoHandler.MyAction)
```

**5. Wire the frontend** (if needed): add the mutation/query hook in `frontend/src/api/<resource>.ts` using `apiFetch`, not raw `fetch`.

## Gotchas

- **Missing field assignment**: If `params.Title = req.Title` is omitted, the record is created with an empty title. Go won't warn you. Carefully compare every field in the request struct against the params struct.
- **Never set status via PATCH**: If adding a field that changes todo lifecycle state, use a dedicated action endpoint (`/done`, `/snooze`, `/reopen`) — not a PATCH field.
- **pgtype nullables**: Optional fields must be wrapped: `pgtype.Text{String: *req.Desc, Valid: true}` — assigning a plain `*string` to a `pgtype.Text` is a compile error.
- **User-scoped queries**: Every query that touches user data must filter by `user_id`. If the sqlc query doesn't take a `user_id` param, add it.
- **Run sqlc generate**: Forgetting to regenerate after changing `.sql` files causes stale references — the Go code will reference functions that don't exist yet.

## Verify

- [ ] SQL query has correct `-- name: X :one/:many` annotation
- [ ] `sqlc generate` ran without errors
- [ ] Every request field is assigned to the params struct
- [ ] `user_id` is from `mw.UserIDFromContext`, not from the request body
- [ ] Route is registered in the correct group (authenticated vs public)
- [ ] Error cases: not found → 404, validation → 422, internal → 500
- [ ] Response uses `respondJSON` with appropriate status code

## Debug

- **Compile error after sqlc generate**: Check that the `.sql` annotation matches the expected Go function signature. Nullability mismatches (e.g. `pgtype.UUID` vs `uuid.UUID`) are common.
- **Record created with zero values**: A field in the request is not assigned to the params struct. Add the assignment.
- **403 instead of 404**: The query found a record but the user_id didn't match — check the WHERE clause in the SQL.

## Update Scaffold

- [ ] Update `.mex/ROUTER.md` "Current Project State" if what's working/not built has changed
- [ ] Update any `.mex/context/` files that are now out of date
- [ ] If this is a new task type without a pattern, create one in `.mex/patterns/` and add to `INDEX.md`

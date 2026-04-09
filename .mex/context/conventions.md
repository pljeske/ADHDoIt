---
name: conventions
description: How code is written in this project — naming, structure, patterns, and style. Load when writing new code or reviewing existing code.
triggers:
  - "convention"
  - "pattern"
  - "naming"
  - "style"
  - "how should I"
  - "what's the right way"
edges:
  - target: context/architecture.md
    condition: when a convention depends on understanding the system structure
  - target: context/stack.md
    condition: when a convention relates to how a specific library is used
  - target: context/auth.md
    condition: when a convention relates to auth middleware or token extraction
  - target: patterns/add-endpoint.md
    condition: when adding a new backend API endpoint
  - target: patterns/add-frontend-feature.md
    condition: when adding a new frontend component, view, or hook
  - target: patterns/db-schema-change.md
    condition: when a convention question involves adding a new DB column or model field
last_updated: 2026-04-09
---

# Conventions

## Naming

- **Go files**: one file per resource in `handler/` (e.g. `todos.go`, `categories.go`, `auth.go`); package names match directory names
- **Go handler structs**: `<Resource>Handler` with constructor `New<Resource>Handler(q *db.Queries, ...) *<Resource>Handler`
- **sqlc query names**: verb-first PascalCase matching the `-- name: X :one/:many` annotation (e.g. `GetTodo`, `ListTodosToday`, `CreateTodo`)
- **Frontend files**: PascalCase for components (`TodoItem.tsx`, `AppShell.tsx`); camelCase for hooks/utils (`todos.ts`, `client.ts`)
- **Query keys**: `['todos', view, categoryId]` for lists, `['todos', id]` for single items, `['categories']`
- **DB columns**: `snake_case`; timestamps always `TIMESTAMPTZ`; dates (deadline, snooze_until) as `DATE` type

## Structure

- **Handler pattern**: decode JSON → validate with `validator.Validate` → call sqlc query → respond via `respondJSON`/`respondError`. No business logic outside handlers.
- **All DB access user-scoped**: every sqlc query that touches user data takes `user_id uuid` as a parameter and filters by it — extract from context via `mw.UserIDFromContext(r.Context())`
- **Frontend API layer**: hooks in `src/api/` (one file per resource); hook files export `use<Action><Resource>()` mutations and `use<Resource>s()` queries; all HTTP calls go through `apiFetch` never raw `fetch`
- **Route registration**: add new routes in `backend/internal/server/server.go` inside the appropriate `r.Group` (authenticated or public)
- **New frontend routes**: create file in `src/routes/`, export the route via `createRoute`, wire into `src/router.ts`

## Patterns

**Go: pgtype nullable fields**
```go
// Correct — use pgtype wrappers for nullable DB columns
params.Description = pgtype.Text{String: *req.Description, Valid: true}
params.CategoryID = pgtype.UUID{Bytes: catID, Valid: true}

// Wrong — assigning plain Go types to pgtype fields fails at compile time
params.Description = *req.Description
```

**Go: error response with code**
```go
// Always include a machine-readable code alongside the human message
respondError(w, http.StatusNotFound, "todo not found", "NOT_FOUND")
respondError(w, http.StatusUnprocessableEntity, err.Error(), "VALIDATION_ERROR")

// Never use http.Error() — it doesn't return JSON
http.Error(w, "not found", 404) // wrong
```

**Frontend: custom form controls must use Controller**
```tsx
// Correct — priority segmented control, custom pickers
<Controller
  name="priority"
  control={control}
  render={({ field }) => (
    <div>
      {OPTIONS.map(opt => (
        <button onClick={() => field.onChange(opt.value)}>{opt.label}</button>
      ))}
    </div>
  )}
/>

// Wrong — setValue without register; value is undefined on submit
setValue('priority', 2) // silently drops on handleSubmit
```

**Frontend: UTC timestamp display in datetime-local inputs**
```tsx
// Correct — convert UTC to local using date-fns format
reminder_at: todo.reminder_at
  ? format(new Date(todo.reminder_at), "yyyy-MM-dd'T'HH:mm")
  : ''

// Wrong — shows UTC time, not user's local time
reminder_at: todo.reminder_at?.slice(0, 16)
```

**Frontend: invalidate after any todo mutation**
```ts
// Correct — broad invalidation covers all views/filters
onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] })

// Wrong — only invalidates one specific view
onSuccess: () => qc.invalidateQueries({ queryKey: ['todos', 'today'] })
```

## Verify Checklist

Before presenting any code:
- [ ] Every DB query filters by `user_id` extracted from JWT context (never from request body)
- [ ] All new API fields are assigned from `req.*` to `params.*` — missing assignments silently create records with zero values
- [ ] Custom form controls (non-native inputs) use `Controller`, not `register` + `setValue`
- [ ] `datetime-local` inputs use `format(new Date(utcStr), "yyyy-MM-dd'T'HH:mm")` for display
- [ ] All frontend HTTP calls use `apiFetch`, not raw `fetch`
- [ ] `status` field is not patchable via `PATCH /todos/:id` — changes go through action endpoints
- [ ] New sqlc queries are regenerated via `sqlc generate` before referencing them in Go handlers
- [ ] Todo mutations call `qc.invalidateQueries({ queryKey: ['todos'] })` on success

---
paths: ["backend/**/*_test.go", "frontend/src/**/*.test.*", "frontend/src/**/*.spec.*"]
---

# Testing Rules

## Backend (Go)

- Use table-driven tests with `net/http/httptest` for every HTTP handler.
- **Minimum coverage per endpoint**: happy path + unauthenticated case.
- Test file alongside source: `handler/todo_handler_test.go` next to `handler/todo_handler.go`.
- Prefer real DB connections in integration tests over mocks — mocked tests have masked prod migration failures before.
- Use `pgxmock` only for pure unit tests of logic that doesn't touch DB behavior (e.g., token hashing).
- Assert HTTP status codes explicitly before asserting response bodies.

## Frontend (React)

- Test components with React Testing Library — no Enzyme.
- Prefer `userEvent` over `fireEvent` for interaction tests.
- Mock `apiFetch` at the module boundary, not at the network level.
- Do not test implementation details (internal state, DOM structure) — test behavior and output.
- `npm run build` must pass (type-check) before any PR; treat TS errors as test failures.

## What NOT to test

- Shadcn/ui internal behavior (it's a dependency, not your code).
- sqlc-generated code (it's generated, not authored).
- TanStack Query's caching behavior (test your mutations/queries, not the library).

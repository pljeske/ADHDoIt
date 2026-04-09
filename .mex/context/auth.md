---
name: auth
description: JWT authentication, refresh token rotation, and the isAuthReady gate. Load when working on auth endpoints, token handling, or session state.
triggers:
  - "auth"
  - "JWT"
  - "token"
  - "refresh"
  - "login"
  - "session"
  - "unauthorized"
  - "logout loop"
edges:
  - target: context/architecture.md
    condition: when understanding how auth integrates with the broader request flow
  - target: context/decisions.md
    condition: when questioning why tokens are stored in memory vs cookies
  - target: context/conventions.md
    condition: when writing handler code that extracts user ID or applies auth middleware
  - target: patterns/debug-auth.md
    condition: when diagnosing auth failures or unexpected logout behavior
  - target: patterns/add-endpoint.md
    condition: when adding a new authenticated endpoint
last_updated: 2026-04-09
---

# Auth

## Token Architecture

- **Access token**: short-lived JWT (default 15m); signed HS256 with `JWT_SECRET`; claims contain `user_id` (UUID string) and `email`; stored **in Zustand memory only** — never written to localStorage or cookies
- **Refresh token**: 32 random bytes, returned as hex string to client; stored as SHA-256 hash in `refresh_tokens` table (never the raw token); stored by client in `localStorage`
- **Token rotation**: every `/auth/refresh` call deletes the old refresh token and issues a new pair — the old token is immediately invalid

## Key Files

| File | Role |
|------|------|
| `backend/internal/handler/auth.go` | Register, Login, Refresh, Logout handlers |
| `backend/internal/middleware/auth.go` | JWT validation middleware; injects UUID into context |
| `frontend/src/store/auth.ts` | Zustand store: `accessToken`, `isAuthReady`, `logout` |
| `frontend/src/api/client.ts` | `apiFetch`: injects Bearer header; single-flight 401 refresh |
| `frontend/src/routes/__root.tsx` | Performs single refresh on app load; gates rendering behind `isAuthReady` |
| `frontend/src/api/auth.ts` | `refreshTokens()` raw fetch (no auth header — used before access token exists) |

## The isAuthReady Gate

On app load, `__root.tsx` calls `refreshTokens()` once using the stored refresh token. Until this resolves (success or failure), `isAuthReady` is `false` and the root renders a blank dark screen. This prevents TanStack Query hooks in child routes from firing before an access token is available, which would cause cascading 401s.

**Critical constraint:** Never trigger any authenticated API call before `isAuthReady` is `true`. The `appLayoutRoute`'s `beforeLoad` also checks for token existence, but `isAuthReady` is the primary guard.

## Single-Flight Refresh in apiFetch

When `apiFetch` receives a 401, it:
1. Checks `isRefreshing` flag — if already refreshing, queues the retry via `refreshSubscribers`
2. If not refreshing: sets `isRefreshing = true`, calls `/auth/refresh`, updates Zustand + localStorage, notifies all queued subscribers, retries the original request
3. On refresh failure: calls `logout()` and redirects to `/login`

This prevents the double-refresh problem that would occur if multiple concurrent requests got 401 simultaneously (token rotation means only one refresh can succeed).

## Extracting User ID in Handlers

```go
// Always use the middleware helper — never trust request body for user_id
userID, _ := mw.UserIDFromContext(r.Context())
// userID is uuid.UUID — use directly as sqlc query parameter
```

## Auth Middleware Application

Auth middleware is applied **per route group**, not globally:
```go
// In server.go
r.Group(func(r chi.Router) {
    r.Use(mw.Auth(cfg.JWTSecret))
    // all authenticated routes registered here
})
// Public routes (register, login, refresh) are outside this group
```

## Refresh Token Storage in DB

Refresh tokens are stored as `SHA-256(hex_token)` in `refresh_tokens.token_hash`. The raw token is returned to the client but never stored server-side. On refresh:
1. SHA-256 the incoming token
2. Look up by hash
3. Verify not expired
4. Delete old record
5. Issue new token pair

---
name: debug-auth
description: Diagnosing auth failures — logout loops, 401 cascades, token refresh races, and push subscription auth errors.
triggers:
  - "logout loop"
  - "keeps logging out"
  - "401"
  - "unauthorized"
  - "token expired"
  - "auth broken"
  - "session"
  - "isAuthReady"
edges:
  - target: context/auth.md
    condition: always — understand the full token architecture before debugging
  - target: patterns/add-endpoint.md
    condition: when the 401 is coming from a specific new endpoint
last_updated: 2026-04-09
---

# Debug Auth

## Context

Load `context/auth.md` before starting. Auth in this project has two failure modes: backend JWT validation errors, and frontend state management issues (isAuthReady race, double-refresh).

## Symptom: Logout Loop on App Load

**Cause**: Both `__root.tsx` and `apiFetch`'s 401 handler try to call `/auth/refresh` with the same refresh token. Token rotation invalidates the token on first use, so the second call fails → logout.

**Fix check**: `__root.tsx` must set `isAuthReady` before TanStack Query fires any requests. Verify:
1. `isAuthReady` is `false` until the initial refresh resolves in `__root.tsx`
2. `__root.tsx` renders `<div className="min-h-[100dvh] bg-[#050505]" />` (blank screen) until `isAuthReady` is true
3. `appLayoutRoute.beforeLoad` only checks for token existence (not isAuthReady) — it's a coarse guard, not the primary one

**If the loop is new after a code change**: Check that no new TanStack Query `useQuery` was added outside the `isAuthReady` gate.

## Symptom: 401 on Every API Call Despite Being Logged In

**Check 1 — apiFetch not used**: Confirm the failing call uses `apiFetch`, not raw `fetch`. Raw `fetch` sends no Authorization header.

**Check 2 — Access token missing from Zustand**: Open browser DevTools, check Zustand state via `useAuthStore.getState().accessToken`. If null, the initial refresh failed or the token was cleared.

**Check 3 — JWT_SECRET mismatch**: If the backend was restarted with a new `JWT_SECRET`, all existing tokens are invalid. Logout, login again.

**Check 4 — Token expiry**: Access token TTL is 15m. If the `apiFetch` 401 handler is broken, tokens won't refresh. Check the `isRefreshing` flag — if it's stuck `true`, all queued refreshSubscribers will hang.

## Symptom: 401 on Push Subscribe

**Cause**: `registerPushSubscription` in `src/lib/sw.ts` used raw `fetch` instead of `apiFetch`. The JWT is stored in Zustand (memory), not cookies — raw fetch sends no auth header.

**Fix**: Ensure `registerPushSubscription` calls `apiFetch('/push/subscribe', { method: 'POST', body: ... })`.

## Symptom: Backend Returns 401 for Valid Token

1. Check the `Authorization` header is `Bearer <token>` (not `Token <token>` or missing `Bearer `)
2. Check the JWT is signed with the current `JWT_SECRET` — decode the JWT (e.g. jwt.io) and verify the `alg` is `HS256`
3. Check token expiry (`exp` claim) — access tokens expire in 15m; if the clock between client and server is skewed, tokens may appear expired
4. Check `mw.Auth` is applied to the route — look in `server.go` to confirm the route is inside the authenticated `r.Group`

## Symptom: Double Refresh / Two Simultaneous 401s

**Cause**: Multiple TanStack Query hooks fire simultaneously before the first refresh completes. The `isRefreshing` + `refreshSubscribers` queue in `apiFetch` should handle this.

**Debug**: Add `console.log('refreshing', isRefreshing)` in `apiFetch` to confirm single-flight behavior. If you see two concurrent refresh calls, the `isRefreshing` module-level variable is being reset unexpectedly.

## Key Files to Check

| File | What to look for |
|------|-----------------|
| `frontend/src/routes/__root.tsx` | `isAuthReady` gate; single refresh on load |
| `frontend/src/api/client.ts` | `isRefreshing` flag; `refreshSubscribers` queue |
| `frontend/src/store/auth.ts` | `isAuthReady` state; `logout` clears `localStorage` |
| `backend/internal/middleware/auth.go` | JWT parsing; `UserIDFromContext` |
| `backend/internal/handler/auth.go` | Token issuance; refresh token hashing; rotation logic |

## Update Scaffold

- [ ] If a new auth failure mode was discovered, add it to this pattern
- [ ] Update `context/auth.md` if the architecture changed
- [ ] Update `.mex/ROUTER.md` "Current Project State" if the issue was a known bug now fixed

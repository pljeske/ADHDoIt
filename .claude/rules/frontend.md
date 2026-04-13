---
paths: ["frontend/**"]
---

# Frontend Rules (React / TypeScript / UI)

## Auth
- `access_token` lives in Zustand memory only — never in `localStorage` or cookies.
- `refresh_token` in `localStorage`.
- Gate all rendering behind `isAuthReady` — `__root.tsx` must render blank until the initial silent refresh resolves; prevents TanStack Query from firing with a stale/missing token.
- `apiFetch` (in `api/client.ts`) injects Bearer header, retries once on 401 after refresh, redirects to `/login` on failure.
- Always use `apiFetch`, never raw `fetch`, for authenticated requests (e.g. in `sw.ts`).

## TanStack Query
- Keys: `['todos', view, categoryId, sort, order]` for lists, `['todos', id]` for single, `['categories']`.
- Invalidate `['todos']` (broad) after every todo mutation.
- Optimistic updates for create/update/delete — no waiting spinners on the happy path.

## Forms (react-hook-form + zod)
- Use `<Controller>` for **all** non-native inputs: segmented controls, date pickers, custom selects.
- Never rely on `setValue()` alone — fields not connected to `register()` or `Controller` are `undefined` in `handleSubmit`.

## Dates
- API timestamps are UTC. Always convert to local before displaying in `datetime-local` inputs:
  ```typescript
  format(new Date(utcString), "yyyy-MM-dd'T'HH:mm")
  ```
- Submission: `new Date(localString).toISOString()` gives correct UTC.

## Styling
- Use `cn()` (from `lib/utils.ts`) for all conditional classNames.
- No inline styles except where Tailwind is genuinely insufficient.
- Priority left border colors: gray (0) / blue (1) / amber (2) / red (3).

## TypeScript
- `moduleResolution: "bundler"` — configure `@/*` alias in both `tsconfig.json` (`paths`) and `vite.config.ts` (`resolve.alias`). Do not use `baseUrl` (deprecated in TS 6.0+).

## Tailwind v4
- PostCSS plugin: `@tailwindcss/postcss` (not `tailwindcss`).
- CSS entry: `@import "tailwindcss"` + `@config "../tailwind.config.ts"`.
- No `autoprefixer` needed.

## Routing
- Manual `createRoute` — no file-based codegen.
- Sort/order state in URL search params (shareable, survives refresh).

## Docker
- Build context is `./frontend`; Dockerfile at `frontend/Dockerfile`.
- Caddyfile is baked into the image — do not mount it as a volume.
- Frontend container listens on port **8080**.
- `http://` prefix in Caddyfile disables auto-HTTPS for local dev; remove for production.

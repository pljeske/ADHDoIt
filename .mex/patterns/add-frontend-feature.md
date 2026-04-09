---
name: add-frontend-feature
description: Adding a new React component, view/route, or TanStack Query hook in the frontend.
triggers:
  - "add component"
  - "new component"
  - "add route"
  - "new page"
  - "add view"
  - "new hook"
  - "add feature"
edges:
  - target: context/conventions.md
    condition: always — run the verify checklist after writing the code
  - target: context/stack.md
    condition: when choosing between libraries or unsure which tool to use
  - target: context/auth.md
    condition: when the feature requires authenticated API calls or session state
last_updated: 2026-04-09
---

# Add Frontend Feature

## Context

Load `context/conventions.md`. All API calls go through `apiFetch`. Custom controls need `Controller`. Date display needs `format()` from date-fns.

## Task: Add a New Component

### Steps

1. Create `src/components/MyComponent.tsx`
2. Use `cn()` from `@/lib/utils` for all conditional classNames — no inline `style` except where Tailwind is insufficient
3. For icons, import from `lucide-react`
4. If the component needs server data, call the relevant hook from `src/api/` (do not call `apiFetch` directly from components)
5. For custom controls (non-native inputs like segmented controls, color pickers): use `Controller` from react-hook-form, not `register`

### Gotchas

- **Priority/segmented controls**: Must use `Controller` — if you use `setValue` without `register`, the value is `undefined` on submit and validation fails silently
- **UTC timestamps in inputs**: Display UTC timestamps using `format(new Date(utcStr), "yyyy-MM-dd'T'HH:mm")` from date-fns; never `.slice(0, 16)` — that shows UTC time in the user's local input
- **No raw fetch**: Even simple GET calls must go through `apiFetch` — auth header injection and 401 retry are handled there

### Verify

- [ ] All conditional classNames use `cn()`
- [ ] No raw `fetch()` calls — all through `apiFetch` via api/ hooks
- [ ] Custom controls use `Controller`, not `setValue`
- [ ] UTC timestamps displayed via `format(new Date(...), "yyyy-MM-dd'T'HH:mm")`

---

## Task: Add a New API Hook

### Steps

1. Add the hook to the relevant file in `src/api/` (or create a new file for a new resource)
2. For queries: use `useQuery` with a stable `queryKey`
3. For mutations: use `useMutation` with `onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] })` (or `['categories']`)
4. Always use `apiFetch` as the `queryFn`/`mutationFn`

```ts
// Query example
export function useMyResource(id: string) {
  return useQuery({
    queryKey: ['my-resource', id],
    queryFn: () => apiFetch<MyResource>(`/my-resource/${id}`),
  })
}

// Mutation example
export function useUpdateMyResource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateData) =>
      apiFetch<MyResource>(`/my-resource/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}
```

### Gotchas

- **Broad invalidation**: Invalidate `['todos']` (not `['todos', 'today']`) — all views share data that may be affected
- **queryKey stability**: Include all filter params in the key so React Query correctly caches different filtered results

### Verify

- [ ] `queryKey` includes all variables that affect the result
- [ ] Mutations invalidate `['todos']` or `['categories']` on success
- [ ] `apiFetch` is used, not raw `fetch`

---

## Task: Add a New Route/View

### Steps

1. Create `src/routes/app/my-view.tsx`
2. Export the route:
```ts
export const myViewRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/my-view',
  component: MyViewPage,
})
```
3. Wire into `src/router.ts`:
```ts
// Add to routeTree
const routeTree = rootRoute.addChildren([
  appLayoutRoute.addChildren([
    todayRoute,
    myViewRoute, // add here
    ...
  ]),
])
```
4. Add navigation link in `src/components/AppShell.tsx` sidebar

### Gotchas

- **Manual router.ts wiring**: TanStack Router in this project uses manual `createRoute` — there is no automatic file-based route detection. If you create the file but forget to update `router.ts`, the route doesn't exist.
- **Parent route**: App routes must have `getParentRoute: () => appLayoutRoute` to get the AppShell wrapper and auth guard

### Verify

- [ ] Route is exported from its file with correct `getParentRoute`
- [ ] Route is added to `routeTree` in `src/router.ts`
- [ ] Navigation link added to AppShell if it should appear in the sidebar
- [ ] Route uses hooks from `src/api/` not direct `apiFetch`

## Update Scaffold

- [ ] Update `.mex/ROUTER.md` "Current Project State" if what's working/not built has changed
- [ ] Update any `.mex/context/` files that are now out of date
- [ ] If this is a new task type without a pattern, create one in `.mex/patterns/` and add to `INDEX.md`

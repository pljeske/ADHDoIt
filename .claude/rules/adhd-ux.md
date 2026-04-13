---
paths: ["frontend/src/**"]
---

# ADHD UX Rules

These rules encode the cognitive accessibility doctrine for ADHDoIt's UI.
Every UI decision must reduce friction and cognitive load for users with ADHD.

## Core Principles

1. **One primary action visible at a time** — no decision paralysis from too many options.
2. **Quick Capture is always first** — `QuickCapture` bar at the top of every list view. Enter = save, Esc = clear. No modal required.
3. **Overdue todos never disappear** — collapsed "X overdue" section at the bottom of Today view. Always reachable without navigation.
4. **Visible affordances** — edit, reschedule, delete appear on hover/focus. Not buried in menus or right-click.
5. **No waiting** — optimistic updates only. The happy path must feel instant.
6. **Short flows** — adding a todo must be ≤2 interactions. Prefer Enter-to-save over modal-then-submit.

## QuickCapture (`src/components/QuickCapture.tsx`)
- Render at the top of: Today, Upcoming, Overdue, Category views.
- Today view: auto-set `deadline = today`.
- Category view: auto-set `category_id`.
- Auto-set `reminder_at = now + 1h` to create a safety net reminder.
- `Enter` submits; `Esc` clears without submission.
- Autofocus on mount in list views.

## TodoItem Actions
- Primary action: checkbox to toggle done — always visible, large tap target.
- Secondary actions (edit sheet, reschedule popover, delete): appear on hover/focus, not on every item simultaneously.
- Overdue items in Today view show Reschedule + Done inline — no navigation required.

## TodoFormSheet
- Opens from the right (shadcn `Sheet`) — does not replace the current view; context is preserved.
- Title field autofocuses immediately.
- Deadline defaults to today; priority defaults to none; reminder defaults to +1h for new todos.
- Inline category creation — user never leaves the sheet to add a category.

## Priority Visual Language
Colored left border on each todo card:
- No priority: gray (`border-gray-300`)
- Low: blue (`border-blue-400`)
- Medium: amber (`border-amber-400`)
- High: red (`border-red-500`)

No text labels needed — color + position is sufficient.

## Keyboard Shortcuts
- `n` globally opens the new todo sheet.
- All interactive elements must be keyboard-reachable (tab order, focus rings).

## Empty States
- Every view must have a non-judgmental empty state (e.g., "Nothing due today — you're clear!").
- No blank white boxes.

## Loading States
- Use skeletons (matching the shape of todo cards), not spinners.
- Skeletons should appear for ≤300ms before real content; suppress for fast connections.

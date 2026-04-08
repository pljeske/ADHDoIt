import { useState } from 'react'
import { Bell, Pencil, Trash2, RotateCcw, AlarmClock } from 'lucide-react'
import { type Todo, useDeleteTodo, useDoneTodo, useReopenTodo, useSnoozeTodo } from '@/api/todos'
import { CategoryBadge } from './CategoryBadge'
import { cn, formatDeadline, isOverdue, PRIORITY_COLORS, PRIORITY_TEXT_COLORS, PRIORITY_LABELS } from '@/lib/utils'
import { Button } from './ui/button'

interface TodoItemProps {
  todo: Todo
  onEdit?: (todo: Todo) => void
  showSnooze?: boolean
}

export function TodoItem({ todo, onEdit, showSnooze = false }: TodoItemProps) {
  const [snoozeDate, setSnoozeDate] = useState('')
  const [showSnoozeInput, setShowSnoozeInput] = useState(false)

  const deleteMut = useDeleteTodo()
  const doneMut = useDoneTodo()
  const reopenMut = useReopenTodo()
  const snoozeMut = useSnoozeTodo()

  const isDone = todo.status === 'done'
  const overdue = todo.deadline ? isOverdue(todo.deadline) : false

  function handleDone() {
    if (isDone) {
      reopenMut.mutate(todo.id)
    } else {
      doneMut.mutate(todo.id)
    }
  }

  function handleSnooze() {
    if (!snoozeDate) return
    snoozeMut.mutate({ id: todo.id, snooze_until: snoozeDate })
    setShowSnoozeInput(false)
    setSnoozeDate('')
  }

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent/30',
        `border-l-4 ${PRIORITY_COLORS[todo.priority] ?? PRIORITY_COLORS[0]}`,
        isDone && 'opacity-60',
      )}
    >
      {/* Checkbox */}
      <button
        onClick={handleDone}
        className={cn(
          'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors',
          isDone
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground hover:border-primary',
        )}
        aria-label={isDone ? 'Reopen todo' : 'Mark as done'}
      >
        {isDone && (
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', isDone && 'line-through text-muted-foreground')}>
          {todo.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {todo.category_id && <CategoryBadge categoryId={todo.category_id} />}
          {todo.deadline && (
            <span
              className={cn(
                'text-xs',
                overdue && !isDone ? 'font-medium text-red-600' : 'text-muted-foreground',
              )}
            >
              {formatDeadline(todo.deadline)}
            </span>
          )}
          {todo.priority > 0 && (
            <span className={cn('text-xs font-medium', PRIORITY_TEXT_COLORS[todo.priority])}>
              {PRIORITY_LABELS[todo.priority]}
            </span>
          )}
          {todo.reminder_at && <Bell className="h-3 w-3 text-muted-foreground" />}
        </div>

        {showSnoozeInput && (
          <div className="mt-2 flex gap-2">
            <input
              type="date"
              value={snoozeDate}
              onChange={(e) => setSnoozeDate(e.target.value)}
              className="rounded border border-input bg-background px-2 py-1 text-xs"
            />
            <Button size="sm" onClick={handleSnooze} disabled={!snoozeDate}>
              Snooze
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowSnoozeInput(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {showSnooze && !isDone && (
          <button
            onClick={() => setShowSnoozeInput(!showSnoozeInput)}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Snooze"
          >
            <AlarmClock className="h-4 w-4" />
          </button>
        )}
        {onEdit && !isDone && (
          <button
            onClick={() => onEdit(todo)}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        {isDone && (
          <button
            onClick={() => reopenMut.mutate(todo.id)}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Reopen"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => deleteMut.mutate(todo.id)}
          className="rounded p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

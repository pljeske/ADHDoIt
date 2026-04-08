import { useState } from 'react'
import { Bell, Pencil, Trash2, RotateCcw, AlarmClock } from 'lucide-react'
import { type Todo, useDeleteTodo, useDoneTodo, useReopenTodo, useSnoozeTodo } from '@/api/todos'
import { CategoryBadge } from './CategoryBadge'
import { cn, formatDeadline, isOverdue, PRIORITY_LABELS } from '@/lib/utils'

const PRIORITY_GLOW = [
  '',
  'shadow-[inset_2px_0_0_#60a5fa]',   // blue-400
  'shadow-[inset_2px_0_0_#fbbf24]',   // amber-400
  'shadow-[inset_2px_0_0_#f87171]',   // red-400
] as const

const PRIORITY_DOT = [
  'bg-white/10',
  'bg-blue-400',
  'bg-amber-400',
  'bg-red-400',
] as const

interface TodoItemProps {
  todo: Todo
  onEdit?: (todo: Todo) => void
  showSnooze?: boolean
  index?: number
}

export function TodoItem({ todo, onEdit, showSnooze = false, index = 0 }: TodoItemProps) {
  const [snoozeDate, setSnoozeDate] = useState('')
  const [showSnoozeInput, setShowSnoozeInput] = useState(false)

  const deleteMut = useDeleteTodo()
  const doneMut = useDoneTodo()
  const reopenMut = useReopenTodo()
  const snoozeMut = useSnoozeTodo()

  const isDone = todo.status === 'done'
  const overdue = todo.deadline ? isOverdue(todo.deadline) : false

  function handleDone() {
    if (isDone) reopenMut.mutate(todo.id)
    else doneMut.mutate(todo.id)
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
        'group relative rounded-2xl overflow-hidden',
        'border border-white/[0.06]',
        'bg-white/[0.03]',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
        PRIORITY_GLOW[todo.priority] ?? '',
        'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        'hover:bg-white/[0.055] hover:border-white/[0.1]',
        'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_2px_0_0_var(--priority-color,transparent)]',
        isDone && 'opacity-50',
        'animate-fade-up opacity-0',
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Checkbox */}
        <button
          onClick={handleDone}
          className={cn(
            'mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-md',
            'border transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
            isDone
              ? 'border-violet-500/60 bg-violet-600/30'
              : 'border-white/[0.15] hover:border-violet-500/50 hover:bg-violet-600/10',
          )}
          aria-label={isDone ? 'Reopen todo' : 'Mark as done'}
        >
          {isDone && (
            <svg className="h-2.5 w-2.5 text-violet-400" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className={cn(
            'text-[13.5px] font-medium leading-snug tracking-[-0.01em]',
            isDone ? 'line-through text-white/25' : 'text-white/85',
          )}>
            {todo.title}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {todo.category_id && <CategoryBadge categoryId={todo.category_id} />}

            {todo.deadline && (
              <span className={cn(
                'text-[11px] font-medium',
                overdue && !isDone
                  ? 'text-red-400/90'
                  : 'text-white/30',
              )}>
                {formatDeadline(todo.deadline)}
              </span>
            )}

            {todo.priority > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/25">
                <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[todo.priority])} />
                {PRIORITY_LABELS[todo.priority]}
              </span>
            )}

            {todo.reminder_at && (
              <Bell className="h-2.5 w-2.5 text-white/20" strokeWidth={1.5} />
            )}
          </div>

          {showSnoozeInput && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="date"
                value={snoozeDate}
                onChange={(e) => setSnoozeDate(e.target.value)}
                className={cn(
                  'rounded-lg bg-white/[0.05] border border-white/[0.08]',
                  'px-2.5 py-1.5 text-[12px] text-white/80',
                  'focus:outline-none focus:ring-1 focus:ring-violet-500/50',
                  '[color-scheme:dark]',
                )}
              />
              <button
                onClick={handleSnooze}
                disabled={!snoozeDate}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-medium',
                  'bg-violet-600/25 text-violet-300 border border-violet-500/30',
                  'transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
                  'hover:bg-violet-600/40 disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                Snooze
              </button>
              <button
                onClick={() => setShowSnoozeInput(false)}
                className="px-3 py-1.5 rounded-lg text-[12px] text-white/35 hover:text-white/60 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Actions — appear on hover */}
        <div className={cn(
          'flex flex-shrink-0 items-center gap-0.5',
          'opacity-0 transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'group-hover:opacity-100 translate-x-1 group-hover:translate-x-0',
        )}>
          {showSnooze && !isDone && (
            <button
              onClick={() => setShowSnoozeInput(!showSnoozeInput)}
              className={cn(
                'h-7 w-7 rounded-lg flex items-center justify-center',
                'text-white/25 transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
                'hover:bg-amber-500/15 hover:text-amber-400',
              )}
              title="Snooze"
            >
              <AlarmClock className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
          {onEdit && !isDone && (
            <button
              onClick={() => onEdit(todo)}
              className={cn(
                'h-7 w-7 rounded-lg flex items-center justify-center',
                'text-white/25 transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
                'hover:bg-white/[0.08] hover:text-white/70',
              )}
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
          {isDone && (
            <button
              onClick={() => reopenMut.mutate(todo.id)}
              className={cn(
                'h-7 w-7 rounded-lg flex items-center justify-center',
                'text-white/25 transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
                'hover:bg-white/[0.08] hover:text-white/70',
              )}
              title="Reopen"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={() => deleteMut.mutate(todo.id)}
            className={cn(
              'h-7 w-7 rounded-lg flex items-center justify-center',
              'text-white/25 transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
              'hover:bg-red-500/15 hover:text-red-400',
            )}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

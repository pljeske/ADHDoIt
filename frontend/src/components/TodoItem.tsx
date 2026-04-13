import { useState } from 'react'
import { Bell, Check, ChevronDown, Clock, Pencil, Repeat, Trash2, RotateCcw, AlarmClock } from 'lucide-react'
import { format } from 'date-fns'
import { type Todo, type SubtaskItem, useDeleteTodo, useDoneTodo, useReopenTodo, useSnoozeTodo, useUpdateTodo } from '@/api/todos'
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

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function snoozePresetDate(preset: 'tomorrow' | 'weekend' | 'nextweek'): string {
  const d = new Date()
  if (preset === 'tomorrow') {
    d.setDate(d.getDate() + 1)
  } else if (preset === 'weekend') {
    const days = ((6 - d.getDay()) + 7) % 7 || 7
    d.setDate(d.getDate() + days)
  } else {
    const days = ((1 - d.getDay()) + 7) % 7 || 7
    d.setDate(d.getDate() + days)
  }
  return format(d, 'yyyy-MM-dd')
}

export function TodoItem({ todo, onEdit, showSnooze = false, index = 0 }: TodoItemProps) {
  const [snoozeDate, setSnoozeDate] = useState('')
  const [showSnoozeInput, setShowSnoozeInput] = useState(false)
  const [subtasksExpanded, setSubtasksExpanded] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [celebrating, setCelebrating] = useState(false)

  const deleteMut = useDeleteTodo()
  const doneMut = useDoneTodo()
  const reopenMut = useReopenTodo()
  const snoozeMut = useSnoozeTodo()
  const updateMut = useUpdateTodo()

  const isDone = todo.status === 'done'
  const overdue = todo.deadline ? isOverdue(todo.deadline) : false
  const subtasks = todo.subtasks ?? []
  const subtaskTotal = subtasks.length
  const subtaskDone = subtasks.filter((s) => s.done).length

  function handleDone() {
    if (isDone) {
      reopenMut.mutate(todo.id)
    } else {
      setCelebrating(true)
      setTimeout(() => setCelebrating(false), 700)
      doneMut.mutate(todo.id)
    }
  }

  function handleSnooze() {
    if (!snoozeDate) return
    snoozeMut.mutate({ id: todo.id, snooze_until: snoozeDate })
    setShowSnoozeInput(false)
    setSnoozeDate('')
  }

  function handlePresetSnooze(preset: 'tomorrow' | 'weekend' | 'nextweek') {
    snoozeMut.mutate({ id: todo.id, snooze_until: snoozePresetDate(preset) })
    setShowSnoozeInput(false)
    setSnoozeDate('')
  }

  function toggleSubtask(subtaskId: string) {
    const updated: SubtaskItem[] = subtasks.map((s) =>
      s.id === subtaskId ? { ...s, done: !s.done } : s,
    )
    updateMut.mutate({ id: todo.id, subtasks: updated })
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
          <div className="flex items-start gap-1.5">
            <p
              onClick={() => onEdit?.(todo)}
              className={cn(
                'flex-1 text-[13.5px] font-medium leading-snug tracking-[-0.01em]',
                isDone ? 'line-through text-white/25' : 'text-white/85',
                onEdit && 'cursor-pointer hover:text-white transition-colors duration-150',
              )}
            >
              {todo.title}
            </p>
            {todo.description && (
              <button
                type="button"
                onClick={() => setDescExpanded((v) => !v)}
                className="mt-[3px] flex-shrink-0 text-white/20 hover:text-white/50 transition-colors duration-150"
                title={descExpanded ? 'Hide description' : 'Show description'}
              >
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', descExpanded && 'rotate-180')} />
              </button>
            )}
          </div>

          {descExpanded && todo.description && (
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/60 whitespace-pre-wrap">
              {todo.description}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {todo.category_id && <CategoryBadge categoryId={todo.category_id} />}

            {todo.deadline && (
              <span className={cn(
                'text-[12px] font-medium',
                overdue && !isDone ? 'text-red-400/90' : 'text-white/50',
              )}>
                {formatDeadline(todo.deadline)}
              </span>
            )}

            {todo.priority > 0 && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-white/45">
                <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[todo.priority])} />
                {PRIORITY_LABELS[todo.priority]}
              </span>
            )}

            {todo.duration_minutes != null && todo.duration_minutes > 0 && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-white/45">
                <Clock className="h-2.5 w-2.5" strokeWidth={1.5} />
                {formatDuration(todo.duration_minutes)}
              </span>
            )}

            {todo.reminder_at && (
              <Bell className="h-2.5 w-2.5 text-white/40" strokeWidth={1.5} />
            )}

            {todo.recurrence_rule && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-violet-400/60">
                <Repeat className="h-2.5 w-2.5" strokeWidth={1.5} />
                {todo.recurrence_rule === 'weekdays' ? 'Weekdays' : todo.recurrence_rule.charAt(0).toUpperCase() + todo.recurrence_rule.slice(1)}
              </span>
            )}

            {subtaskTotal > 0 && (
              <button
                type="button"
                onClick={() => setSubtasksExpanded(!subtasksExpanded)}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-white/45 hover:text-white/70 transition-colors"
              >
                <span className={cn(
                  'h-3.5 w-3.5 rounded-full flex items-center justify-center text-[8px] font-bold',
                  subtaskDone === subtaskTotal
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-white/[0.08] text-white/40',
                )}>
                  {subtaskDone === subtaskTotal ? '✓' : subtaskDone}
                </span>
                {subtaskDone}/{subtaskTotal}
                <ChevronDown className={cn(
                  'h-2.5 w-2.5 transition-transform duration-200',
                  subtasksExpanded && 'rotate-180',
                )} />
              </button>
            )}
          </div>

          {/* Subtask checklist */}
          {subtasksExpanded && subtaskTotal > 0 && (
            <div className="mt-2.5 space-y-1.5 pl-1">
              {subtasks.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSubtask(s.id)}
                  className="flex items-center gap-2 w-full text-left group/sub"
                >
                  <span className={cn(
                    'h-3.5 w-3.5 flex-shrink-0 rounded flex items-center justify-center',
                    'border transition-all duration-150',
                    s.done
                      ? 'border-emerald-500/50 bg-emerald-500/20'
                      : 'border-white/20 group-hover/sub:border-white/40',
                  )}>
                    {s.done && <Check className="h-2 w-2 text-emerald-400" strokeWidth={3} />}
                  </span>
                  <span className={cn(
                    'text-[12px] leading-tight',
                    s.done ? 'line-through text-white/25' : 'text-white/60',
                  )}>
                    {s.title}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Reschedule panel */}
          {showSnoozeInput && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-1.5">
                {(['tomorrow', 'weekend', 'nextweek'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePresetSnooze(p)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium',
                      'bg-amber-500/10 text-amber-400/70 border border-amber-500/20',
                      'hover:bg-amber-500/20 hover:text-amber-400',
                      'transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
                    )}
                  >
                    {p === 'tomorrow' ? 'Tomorrow' : p === 'weekend' ? 'Weekend' : 'Next week'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
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
                  Reschedule
                </button>
                <button
                  onClick={() => setShowSnoozeInput(false)}
                  className="px-3 py-1.5 rounded-lg text-[12px] text-white/35 hover:text-white/60 transition-colors"
                >
                  Cancel
                </button>
              </div>
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
              title="Reschedule"
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

      {celebrating && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl">
          <div className="absolute h-8 w-8 rounded-full border-2 border-emerald-400/60 animate-celebrate-ring" />
          <div className="absolute flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/20 animate-celebrate-check">
            <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />
          </div>
        </div>
      )}
    </div>
  )
}

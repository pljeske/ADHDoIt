import { createRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Clock, AlarmClock } from 'lucide-react'
import { format } from 'date-fns'
import { useTodos, useUpdateTodo, useDoneTodo, useSnoozeTodo, type SubtaskItem } from '@/api/todos'
import { cn } from '@/lib/utils'
import { appLayoutRoute } from './__layout'

export const focusRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/app/focus',
  component: FocusPage,
})

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function FocusPage() {
  const [taskIndex, setTaskIndex] = useState(0)
  const { data: todos, isLoading } = useTodos({ view: 'today' })
  const doneMut = useDoneTodo()
  const snoozeMut = useSnoozeTodo()
  const updateMut = useUpdateTodo()

  const activeTasks = todos?.filter((t) => t.status !== 'done') ?? []
  const currentTask = activeTasks[taskIndex] ?? null

  function handleDone() {
    if (!currentTask) return
    doneMut.mutate(currentTask.id, {
      onSuccess: () => {
        // Stay at same index — the list shrinks, so next task slides in
        setTaskIndex((i) => Math.min(i, activeTasks.length - 2))
      },
    })
  }

  function handleSkip() {
    setTaskIndex((i) => (i + 1) % activeTasks.length)
  }

  function handleSnooze() {
    if (!currentTask) return
    const tomorrow = format(new Date(Date.now() + 86_400_000), 'yyyy-MM-dd')
    snoozeMut.mutate({ id: currentTask.id, snooze_until: tomorrow })
  }

  function toggleSubtask(subtaskId: string) {
    if (!currentTask) return
    const updated: SubtaskItem[] = (currentTask.subtasks ?? []).map((s) =>
      s.id === subtaskId ? { ...s, done: !s.done } : s,
    )
    updateMut.mutate({ id: currentTask.id, subtasks: updated })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
      </div>
    )
  }

  if (activeTasks.length === 0) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-8">
        <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Check className="h-8 w-8 text-emerald-400" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-white/90">All done!</h2>
          <p className="mt-1 text-[14px] text-white/35">No active tasks for today.</p>
        </div>
        <Link to="/app/today" className="text-[13px] text-violet-400/70 hover:text-violet-400 transition-colors">
          Back to Today
        </Link>
      </div>
    )
  }

  const subtasks = currentTask?.subtasks ?? []
  const subtaskTotal = subtasks.length
  const subtaskDone = subtasks.filter((s) => s.done).length

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <Link
          to="/app/today"
          className="flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/60 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Exit focus
        </Link>
        <span className="text-[12px] text-white/25 tabular-nums">
          {taskIndex + 1} / {activeTasks.length}
        </span>
      </div>

      {/* Main focus area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
        {/* Task card */}
        <div className={cn(
          'w-full max-w-lg rounded-3xl',
          'border border-white/[0.08]',
          'bg-white/[0.03]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
          'p-8',
        )}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-400/60 mb-4">
            Current task
          </p>

          <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-white/95 leading-snug">
            {currentTask?.title}
          </h1>

          {currentTask?.description && (
            <p className="mt-3 text-[14px] text-white/40 leading-relaxed">
              {currentTask.description}
            </p>
          )}

          {/* Meta */}
          <div className="mt-4 flex flex-wrap gap-3">
            {currentTask?.duration_minutes != null && currentTask.duration_minutes > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-white/35">
                <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                {formatDuration(currentTask.duration_minutes)}
              </span>
            )}
            {currentTask?.deadline && (
              <span className="text-[12px] text-white/30">{currentTask.deadline}</span>
            )}
          </div>

          {/* Subtasks */}
          {subtaskTotal > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium text-white/35 uppercase tracking-[0.1em]">
                  Steps
                </span>
                <span className="text-[11px] text-white/25 tabular-nums">
                  {subtaskDone}/{subtaskTotal}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1 rounded-full bg-white/[0.06] mb-4 overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500/60 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  style={{ width: `${subtaskTotal > 0 ? (subtaskDone / subtaskTotal) * 100 : 0}%` }}
                />
              </div>

              <ul className="space-y-2">
                {subtasks.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => toggleSubtask(s.id)}
                      className="flex items-center gap-3 w-full text-left group"
                    >
                      <span className={cn(
                        'h-5 w-5 flex-shrink-0 rounded-md flex items-center justify-center',
                        'border transition-all duration-150',
                        s.done
                          ? 'border-emerald-500/50 bg-emerald-500/20'
                          : 'border-white/20 group-hover:border-white/40',
                      )}>
                        {s.done && <Check className="h-3 w-3 text-emerald-400" strokeWidth={2.5} />}
                      </span>
                      <span className={cn(
                        'text-[14px] leading-snug',
                        s.done ? 'line-through text-white/25' : 'text-white/70',
                      )}>
                        {s.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="w-full max-w-lg flex flex-col gap-2.5">
          <button
            onClick={handleDone}
            disabled={doneMut.isPending}
            className={cn(
              'w-full py-4 rounded-2xl',
              'text-[15px] font-semibold tracking-[-0.01em]',
              'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
              'hover:bg-emerald-500/25 hover:border-emerald-500/40',
              'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
              'active:scale-[0.98]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            Mark done
          </button>

          <div className="flex gap-2.5">
            <button
              onClick={handleSnooze}
              disabled={snoozeMut.isPending}
              className={cn(
                'flex-1 py-3 rounded-2xl flex items-center justify-center gap-2',
                'text-[13px] font-medium text-amber-400/60',
                'bg-amber-500/[0.06] border border-amber-500/15',
                'hover:bg-amber-500/12 hover:text-amber-400/80',
                'transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
                'disabled:opacity-40',
              )}
            >
              <AlarmClock className="h-3.5 w-3.5" strokeWidth={1.5} />
              Reschedule to tomorrow
            </button>

            {activeTasks.length > 1 && (
              <button
                onClick={handleSkip}
                className={cn(
                  'flex-1 py-3 rounded-2xl flex items-center justify-center gap-2',
                  'text-[13px] font-medium text-white/30',
                  'bg-white/[0.03] border border-white/[0.06]',
                  'hover:bg-white/[0.06] hover:text-white/50',
                  'transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
                )}
              >
                Next task
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

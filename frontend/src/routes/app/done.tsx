import { createRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { Flame, CheckCircle2 } from 'lucide-react'
import { useTodos } from '@/api/todos'
import { TodoList } from '@/components/TodoList'
import { appLayoutRoute } from './__layout'
import { cn } from '@/lib/utils'

export const doneRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/app/done',
  component: DonePage,
})

function SkeletonItem() {
  return <div className="h-[58px] rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />
}

function computeStreak(doneDates: string[]): number {
  if (doneDates.length === 0) return 0
  const unique = [...new Set(doneDates)].sort().reverse()
  const today = new Date().toISOString().slice(0, 10)
  let streak = 0
  let expected = today
  for (const d of unique) {
    if (d === expected) {
      streak++
      const dt = new Date(expected)
      dt.setDate(dt.getDate() - 1)
      expected = dt.toISOString().slice(0, 10)
    } else if (d < expected) {
      break
    }
  }
  return streak
}

function DonePage() {
  const { data: todos, isLoading } = useTodos({ view: 'done' })

  const stats = useMemo(() => {
    if (!todos) return null
    const total = todos.length
    const today = new Date().toISOString().slice(0, 10)
    const todayCount = todos.filter((t) => t.done_at?.slice(0, 10) === today).length
    const doneDates = todos.map((t) => t.done_at?.slice(0, 10)).filter(Boolean) as string[]
    const streak = computeStreak(doneDates)
    return { total, todayCount, streak }
  }, [todos])

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8 animate-fade-up opacity-0" style={{ animationDelay: '0ms' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400/50 mb-1">
          Completed
        </p>
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-white/90">
          Done
        </h1>
      </div>

      {/* Stats row */}
      {stats && stats.total > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3 animate-fade-up opacity-0" style={{ animationDelay: '60ms' }}>
          <div className={cn(
            'rounded-2xl p-4 border',
            'bg-white/[0.03] border-white/[0.06]',
            'text-center',
          )}>
            <p className="text-[22px] font-semibold tracking-[-0.03em] text-white/90 tabular-nums">
              {stats.total}
            </p>
            <p className="mt-0.5 text-[11px] text-white/30">Total done</p>
          </div>

          <div className={cn(
            'rounded-2xl p-4 border',
            'bg-white/[0.03] border-white/[0.06]',
            'text-center',
          )}>
            <div className="flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400/70" strokeWidth={1.5} />
              <p className="text-[22px] font-semibold tracking-[-0.03em] text-white/90 tabular-nums">
                {stats.todayCount}
              </p>
            </div>
            <p className="mt-0.5 text-[11px] text-white/30">Today</p>
          </div>

          <div className={cn(
            'rounded-2xl p-4 border',
            stats.streak > 0
              ? 'bg-amber-500/[0.05] border-amber-500/20'
              : 'bg-white/[0.03] border-white/[0.06]',
            'text-center',
          )}>
            <div className="flex items-center justify-center gap-1">
              {stats.streak > 0 && (
                <Flame className="h-4 w-4 text-amber-400/80" strokeWidth={1.5} />
              )}
              <p className={cn(
                'text-[22px] font-semibold tracking-[-0.03em] tabular-nums',
                stats.streak > 0 ? 'text-amber-400' : 'text-white/90',
              )}>
                {stats.streak}
              </p>
            </div>
            <p className="mt-0.5 text-[11px] text-white/30">
              {stats.streak === 1 ? 'day streak' : 'day streak'}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-1.5">
          {[1, 2, 3].map((i) => <SkeletonItem key={i} />)}
        </div>
      ) : (
        <TodoList
          todos={todos ?? []}
          emptyMessage="No completed todos yet. Get to it!"
        />
      )}
    </div>
  )
}

import { createRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { ChevronDown, AlertTriangle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { useTodos, type Todo } from '@/api/todos'
import { useCategories } from '@/api/categories'
import { TodoList } from '@/components/TodoList'
import { TodoFormSheet } from '@/components/TodoFormSheet'
import { QuickCapture } from '@/components/QuickCapture'
import { FilterBar, type TodoFilters } from '@/components/FilterBar'
import { cn } from '@/lib/utils'
import { appLayoutRoute } from './__layout'

export const todayRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/app/today',
  component: TodayPage,
})

function SkeletonItem() {
  return (
    <div className="h-[58px] rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />
  )
}

function TodayPage() {
  const [editTodo, setEditTodo] = useState<Todo | null>(null)
  const [overdueExpanded, setOverdueExpanded] = useState(false)
  const [filters, setFilters] = useState<TodoFilters>({ priority: null, categoryId: null })

  const { data: todayTodos, isLoading: loadingToday } = useTodos({ view: 'today' })
  const { data: overdueTodos } = useTodos({ view: 'overdue' })
  const { data: categories } = useCategories()

  const overdueCount = overdueTodos?.length ?? 0
  const totalToday = todayTodos?.length ?? 0
  const doneToday = todayTodos?.filter((t) => t.status === 'done').length ?? 0

  const filteredTodos = useMemo(() => {
    if (!todayTodos) return []
    return todayTodos.filter((t) => {
      if (filters.priority !== null && t.priority !== filters.priority) return false
      if (filters.categoryId !== null && t.category_id !== filters.categoryId) return false
      return true
    })
  }, [todayTodos, filters])

  const totalEstimatedMinutes = useMemo(() => {
    return filteredTodos
      .filter((t) => t.status !== 'done' && t.duration_minutes)
      .reduce((sum, t) => sum + (t.duration_minutes ?? 0), 0)
  }, [filteredTodos])

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  function formatTotal(minutes: number): string {
    if (minutes < 60) return `${minutes}m`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 animate-fade-up opacity-0" style={{ animationDelay: '0ms' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/25 mb-1">
          {todayDate}
        </p>
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-white/90">
          Today
        </h1>
        {!loadingToday && totalToday > 0 && (
          <div className="mt-1 flex items-center gap-3 flex-wrap">
            <p className="text-[13px] text-white/30 tabular-nums">
              {doneToday > 0 ? `${doneToday} / ${totalToday} done` : `${totalToday} ${totalToday === 1 ? 'task' : 'tasks'} today`}
            </p>
            {totalEstimatedMinutes > 0 && (
              <span className="inline-flex items-center gap-1 text-[12px] text-white/20">
                <Clock className="h-3 w-3" strokeWidth={1.5} />
                {formatTotal(totalEstimatedMinutes)} estimated
              </span>
            )}
          </div>
        )}
      </div>

      <QuickCapture
        defaultDeadline={format(new Date(), 'yyyy-MM-dd')}
        placeholder="Add to today..."
      />

      {/* Filter bar */}
      {!loadingToday && totalToday > 0 && (
        <div className="mt-3">
          <FilterBar filters={filters} onChange={setFilters} categories={categories} />
        </div>
      )}

      {/* Todo list */}
      {loadingToday ? (
        <div className="space-y-1.5">
          {[1, 2, 3].map((i) => <SkeletonItem key={i} />)}
        </div>
      ) : (
        <TodoList
          todos={filteredTodos}
          onEdit={setEditTodo}
          showSnooze
          emptyMessage={
            filters.priority !== null || filters.categoryId !== null
              ? 'No tasks match the current filter.'
              : 'All clear for today. Press N to add a new todo.'
          }
        />
      )}

      {/* Overdue section */}
      {overdueCount > 0 && (
        <div className={cn(
          'mt-6 rounded-2xl overflow-hidden',
          'border border-amber-500/15 bg-amber-500/[0.04]',
          'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'animate-fade-up opacity-0',
        )} style={{ animationDelay: '200ms' }}>
          <button
            onClick={() => setOverdueExpanded(!overdueExpanded)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3.5',
              'transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
              'hover:bg-amber-500/[0.04]',
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400/70 flex-shrink-0" strokeWidth={1.5} />
            <span className="flex-1 text-left text-[13px] font-medium text-amber-400/80">
              {overdueCount} overdue {overdueCount === 1 ? 'item' : 'items'}
            </span>
            <span className={cn(
              'h-5 w-5 rounded-full flex items-center justify-center',
              'bg-amber-500/10 text-amber-400/50',
              'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
              overdueExpanded && 'rotate-180',
            )}>
              <ChevronDown className="h-3 w-3" strokeWidth={2} />
            </span>
          </button>

          {overdueExpanded && (
            <div className="px-3 pb-3">
              <TodoList
                todos={overdueTodos ?? []}
                onEdit={setEditTodo}
                showSnooze
                emptyMessage=""
              />
            </div>
          )}
        </div>
      )}

      <TodoFormSheet
        open={!!editTodo}
        onOpenChange={(o) => { if (!o) setEditTodo(null) }}
        todo={editTodo}
      />
    </div>
  )
}

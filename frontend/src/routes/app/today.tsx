import { createRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useTodos, type Todo } from '@/api/todos'
import { TodoList } from '@/components/TodoList'
import { TodoFormSheet } from '@/components/TodoFormSheet'
import { appLayoutRoute } from './__layout'

export const todayRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/app/today',
  component: TodayPage,
})

function TodayPage() {
  const [editTodo, setEditTodo] = useState<Todo | null>(null)
  const [overdueExpanded, setOverdueExpanded] = useState(false)

  const { data: todayTodos, isLoading: loadingToday } = useTodos({ view: 'today' })
  const { data: overdueTodos } = useTodos({ view: 'overdue' })

  const overdueCount = overdueTodos?.length ?? 0

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {loadingToday ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <TodoList
          todos={todayTodos ?? []}
          onEdit={setEditTodo}
          emptyMessage="All clear for today! Press N to add a new todo."
        />
      )}

      {overdueCount > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setOverdueExpanded(!overdueExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700"
          >
            {overdueExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {overdueCount} overdue {overdueCount === 1 ? 'item' : 'items'}
          </button>

          {overdueExpanded && (
            <div className="mt-3">
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

      <TodoFormSheet open={!!editTodo} onOpenChange={(o) => { if (!o) setEditTodo(null) }} todo={editTodo} />
    </div>
  )
}

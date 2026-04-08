import { createRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTodos, type Todo } from '@/api/todos'
import { TodoList } from '@/components/TodoList'
import { TodoFormSheet } from '@/components/TodoFormSheet'
import { appLayoutRoute } from './__layout'

export const upcomingRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/app/upcoming',
  component: UpcomingPage,
})

function UpcomingPage() {
  const [editTodo, setEditTodo] = useState<Todo | null>(null)
  const { data: todos, isLoading } = useTodos({ view: 'upcoming' })

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Upcoming</h1>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <TodoList
          todos={todos ?? []}
          onEdit={setEditTodo}
          emptyMessage="Nothing upcoming. Great job staying ahead!"
        />
      )}

      <TodoFormSheet open={!!editTodo} onOpenChange={(o) => { if (!o) setEditTodo(null) }} todo={editTodo} />
    </div>
  )
}

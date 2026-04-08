import { createRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTodos, type Todo } from '@/api/todos'
import { TodoList } from '@/components/TodoList'
import { TodoFormSheet } from '@/components/TodoFormSheet'
import { appLayoutRoute } from './__layout'

export const overdueRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/app/overdue',
  component: OverduePage,
})

function OverduePage() {
  const [editTodo, setEditTodo] = useState<Todo | null>(null)
  const { data: todos, isLoading } = useTodos({ view: 'overdue' })

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-2 text-2xl font-bold">Overdue</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        These todos are past their deadline. Snooze or complete them.
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <TodoList
          todos={todos ?? []}
          onEdit={setEditTodo}
          showSnooze
          emptyMessage="No overdue todos. You're on top of things!"
        />
      )}

      <TodoFormSheet open={!!editTodo} onOpenChange={(o) => { if (!o) setEditTodo(null) }} todo={editTodo} />
    </div>
  )
}

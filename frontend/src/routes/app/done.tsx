import { createRoute } from '@tanstack/react-router'
import { useTodos } from '@/api/todos'
import { TodoList } from '@/components/TodoList'
import { appLayoutRoute } from './__layout'

export const doneRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/app/done',
  component: DonePage,
})

function DonePage() {
  const { data: todos, isLoading } = useTodos({ view: 'done' })

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Done</h1>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
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

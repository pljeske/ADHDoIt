import { createRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTodos, type Todo } from '@/api/todos'
import { useCategories } from '@/api/categories'
import { TodoList } from '@/components/TodoList'
import { TodoFormSheet } from '@/components/TodoFormSheet'
import { appLayoutRoute } from './__layout'

export const categoryRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/app/category/$id',
  component: CategoryPage,
})

function CategoryPage() {
  const { id } = categoryRoute.useParams()
  const [editTodo, setEditTodo] = useState<Todo | null>(null)
  const { data: todos, isLoading } = useTodos({ view: 'category', category_id: id })
  const { data: categories } = useCategories()

  const category = categories?.find((c) => c.id === id)

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        {category && (
          <span
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: category.color }}
          />
        )}
        <h1 className="text-2xl font-bold">{category?.name ?? 'Category'}</h1>
      </div>

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
          emptyMessage="No active todos in this category."
        />
      )}

      <TodoFormSheet open={!!editTodo} onOpenChange={(o) => { if (!o) setEditTodo(null) }} todo={editTodo} />
    </div>
  )
}

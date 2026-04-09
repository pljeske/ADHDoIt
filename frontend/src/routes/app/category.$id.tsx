import { createRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTodos, type Todo } from '@/api/todos'
import { useCategories } from '@/api/categories'
import { TodoList } from '@/components/TodoList'
import { TodoFormSheet } from '@/components/TodoFormSheet'
import { QuickCapture } from '@/components/QuickCapture'
import { appLayoutRoute } from './__layout'

export const categoryRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/app/category/$id',
  component: CategoryPage,
})

function SkeletonItem() {
  return <div className="h-[58px] rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />
}

function CategoryPage() {
  const { id } = categoryRoute.useParams()
  const [editTodo, setEditTodo] = useState<Todo | null>(null)
  const { data: todos, isLoading } = useTodos({ view: 'category', category_id: id })
  const { data: categories } = useCategories()

  const category = categories?.find((c) => c.id === id)

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8 animate-fade-up opacity-0" style={{ animationDelay: '0ms' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/25 mb-1">
          Category
        </p>
        <div className="flex items-center gap-3">
          {category && (
            <span
              className="h-3 w-3 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]"
              style={{ backgroundColor: category.color, color: category.color }}
            />
          )}
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-white/90">
            {category?.name ?? 'Category'}
          </h1>
        </div>
      </div>

      <QuickCapture categoryId={id} placeholder="Add to this category..." />

      {isLoading ? (
        <div className="space-y-1.5">
          {[1, 2, 3].map((i) => <SkeletonItem key={i} />)}
        </div>
      ) : (
        <TodoList
          todos={todos ?? []}
          onEdit={setEditTodo}
          emptyMessage="No active todos in this category."
        />
      )}

      <TodoFormSheet
        open={!!editTodo}
        onOpenChange={(o) => { if (!o) setEditTodo(null) }}
        todo={editTodo}
      />
    </div>
  )
}

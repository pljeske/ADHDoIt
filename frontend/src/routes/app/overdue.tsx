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

function SkeletonItem() {
  return <div className="h-[58px] rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />
}

function OverduePage() {
  const [editTodo, setEditTodo] = useState<Todo | null>(null)
  const { data: todos, isLoading } = useTodos({ view: 'overdue' })

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8 animate-fade-up opacity-0" style={{ animationDelay: '0ms' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-400/50 mb-1">
          Past Deadline
        </p>
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-white/90">
          Overdue
        </h1>
        <p className="mt-1.5 text-[13px] text-white/30 leading-relaxed">
          Snooze, complete, or delete these to clear the backlog.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-1.5">
          {[1, 2].map((i) => <SkeletonItem key={i} />)}
        </div>
      ) : (
        <TodoList
          todos={todos ?? []}
          onEdit={setEditTodo}
          showSnooze
          emptyMessage="No overdue todos. You're on top of things!"
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

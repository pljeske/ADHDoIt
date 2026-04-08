import { createRoute } from '@tanstack/react-router'
import { useTodos } from '@/api/todos'
import { TodoList } from '@/components/TodoList'
import { appLayoutRoute } from './__layout'

export const doneRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/app/done',
  component: DonePage,
})

function SkeletonItem() {
  return <div className="h-[58px] rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />
}

function DonePage() {
  const { data: todos, isLoading } = useTodos({ view: 'done' })

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

import { Sparkles } from 'lucide-react'
import { type Todo } from '@/api/todos'
import { TodoItem } from './TodoItem'

interface TodoListProps {
  todos: Todo[]
  onEdit?: (todo: Todo) => void
  showSnooze?: boolean
  emptyMessage?: string
}

export function TodoList({ todos, onEdit, showSnooze, emptyMessage = 'No todos here.' }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="h-10 w-10 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white/20" strokeWidth={1.5} />
        </div>
        <p className="text-[13px] text-white/25 text-center max-w-[200px] leading-relaxed">
          {emptyMessage}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {todos.map((todo, i) => (
        <TodoItem key={todo.id} todo={todo} onEdit={onEdit} showSnooze={showSnooze} index={i} />
      ))}
    </div>
  )
}

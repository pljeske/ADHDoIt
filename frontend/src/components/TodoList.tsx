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
      <div className="py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} onEdit={onEdit} showSnooze={showSnooze} />
      ))}
    </div>
  )
}

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useCreateTodo } from '@/api/todos'
import { cn } from '@/lib/utils'

interface QuickCaptureProps {
  defaultDeadline?: string
  categoryId?: string | null
  placeholder?: string
}

export function QuickCapture({ defaultDeadline, categoryId, placeholder = 'Add a task...' }: QuickCaptureProps) {
  const [value, setValue] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const createTodo = useCreateTodo()

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setValue('')
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const title = value.trim()
      if (!title) return
      createTodo.mutate(
        {
          title,
          deadline: defaultDeadline,
          category_id: categoryId ?? null,
          reminder_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
        {
          onSuccess: () => {
            setValue('')
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 800)
          },
        },
      )
    }
  }

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-2xl px-4 py-3',
      'border transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
      showSuccess
        ? 'bg-emerald-500/[0.05] border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
        : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.05]',
    )}>
      <Plus className="h-3.5 w-3.5 flex-shrink-0 text-violet-400/70" strokeWidth={2} />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'flex-1 bg-transparent text-[13.5px] font-medium',
          'text-white/80 placeholder:text-white/20',
          'focus:outline-none',
        )}
      />
    </div>
  )
}

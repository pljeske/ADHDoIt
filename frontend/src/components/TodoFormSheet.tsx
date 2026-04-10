import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, X } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from './ui/sheet'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select } from './ui/select'
import { useCategories, useCreateCategory } from '@/api/categories'
import { type Todo, type SubtaskItem, type CreateTodoData, type UpdateTodoData, useCreateTodo, useUpdateTodo } from '@/api/todos'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  category_id: z.string(),
  deadline: z.string(),
  priority: z.number().min(0).max(3),
  reminder_at: z.string(),
  duration_minutes: z.string(), // stored as string from input, parsed on submit
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  todo?: Todo | null
}

const PRIORITY_OPTIONS = [
  { value: 0, label: 'None', color: 'text-white/30' },
  { value: 1, label: 'Low', color: 'text-blue-400' },
  { value: 2, label: 'Medium', color: 'text-amber-400' },
  { value: 3, label: 'High', color: 'text-red-400' },
]

const CATEGORY_PRESETS = [
  { name: 'Work', color: '#6366f1' },
  { name: 'Personal', color: '#8b5cf6' },
  { name: 'Health', color: '#10b981' },
  { name: 'Home', color: '#f59e0b' },
]

export function TodoFormSheet({ open, onOpenChange, todo }: Props) {
  const { data: categories } = useCategories()
  const createTodo = useCreateTodo()
  const updateTodo = useUpdateTodo()
  const createCategory = useCreateCategory()
  const isEdit = !!todo
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Subtasks managed as local state alongside the form
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      category_id: '',
      deadline: format(new Date(), 'yyyy-MM-dd'),
      priority: 0,
      reminder_at: '',
      duration_minutes: '',
    },
  })

  useEffect(() => {
    if (!open) return
    if (todo) {
      reset({
        title: todo.title,
        description: todo.description ?? '',
        category_id: todo.category_id ?? '',
        deadline: todo.deadline ?? format(new Date(), 'yyyy-MM-dd'),
        priority: todo.priority,
        reminder_at: todo.reminder_at ? format(new Date(todo.reminder_at), "yyyy-MM-dd'T'HH:mm") : '',
        duration_minutes: todo.duration_minutes ? String(todo.duration_minutes) : '',
      })
      setSubtasks(todo.subtasks ?? [])
    } else {
      reset({
        title: '',
        description: '',
        category_id: '',
        deadline: format(new Date(), 'yyyy-MM-dd'),
        priority: 0,
        reminder_at: format(new Date(Date.now() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
        duration_minutes: '',
      })
      setSubtasks([])
    }
    setNewSubtaskTitle('')
  }, [open, todo, reset])

  function addSubtask() {
    const title = newSubtaskTitle.trim()
    if (!title) return
    setSubtasks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title, done: false },
    ])
    setNewSubtaskTitle('')
  }

  function removeSubtask(id: string) {
    setSubtasks((prev) => prev.filter((s) => s.id !== id))
  }

  async function handlePresetCategory(name: string, color: string) {
    const cat = await createCategory.mutateAsync({ name, color })
    reset({ category_id: cat.id } as Partial<FormData>)
  }

  async function onSubmit(data: FormData) {
    setSubmitError(null)
    const durationParsed = parseInt(data.duration_minutes, 10)
    const payload: CreateTodoData = {
      title: data.title,
      description: data.description || undefined,
      category_id: data.category_id || null,
      deadline: data.deadline || undefined,
      priority: data.priority,
      reminder_at: data.reminder_at ? new Date(data.reminder_at).toISOString() : null,
      duration_minutes: !isNaN(durationParsed) && durationParsed > 0 ? durationParsed : null,
      subtasks,
    }
    try {
      if (isEdit && todo) {
        await updateTodo.mutateAsync({ id: todo.id, ...(payload as UpdateTodoData) })
      } else {
        await createTodo.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save todo')
    }
  }

  const showPresets = categories && categories.length === 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetClose onClose={() => onOpenChange(false)} />
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Todo' : 'New Todo'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 flex-1">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              autoFocus
              {...register('title')}
              placeholder="What needs to be done?"
            />
            {errors.title && (
              <p className="mt-1.5 text-[11px] text-red-400/80">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Optional details..."
              rows={3}
            />
          </div>

          {/* Deadline */}
          <div>
            <Label htmlFor="deadline">Deadline</Label>
            <Input id="deadline" type="date" {...register('deadline')} />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category_id">Category</Label>
            <Select id="category_id" {...register('category_id')}>
              <option value="">None</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            {/* Category presets when none exist */}
            {showPresets && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="w-full text-[11px] text-white/30">Quick create:</span>
                {CATEGORY_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handlePresetCategory(p.name, p.color)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                      'text-[11px] font-medium text-white/50',
                      'bg-white/[0.04] border border-white/[0.08]',
                      'hover:bg-white/[0.08] hover:text-white/80',
                      'transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
                    )}
                  >
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority — segmented control */}
          <div>
            <Label>Priority</Label>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <div className="flex gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-[12px] font-medium',
                        'transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
                        field.value === opt.value
                          ? 'bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ' + opt.color
                          : 'text-white/45 hover:text-white/65',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Reminder */}
          <div>
            <Label htmlFor="reminder_at">Reminder</Label>
            <Input id="reminder_at" type="datetime-local" {...register('reminder_at')} />
          </div>

          {/* Duration estimate */}
          <div>
            <Label htmlFor="duration_minutes">Time estimate (minutes)</Label>
            <Input
              id="duration_minutes"
              type="number"
              min={1}
              placeholder="e.g. 30"
              {...register('duration_minutes')}
            />
          </div>

          {/* Subtasks */}
          <div>
            <Label>Subtasks</Label>

            {subtasks.length > 0 && (
              <ul className="mb-2 space-y-1">
                {subtasks.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <span className="flex-1 text-[12px] text-white/65 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 leading-snug">
                      {s.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSubtask(s.id)}
                      className="h-6 w-6 flex items-center justify-center rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <Input
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addSubtask() }
                }}
                placeholder="Add a step..."
              />
              <button
                type="button"
                onClick={addSubtask}
                disabled={!newSubtaskTitle.trim()}
                className={cn(
                  'flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-xl',
                  'bg-white/[0.05] border border-white/[0.08] text-white/40',
                  'hover:bg-violet-600/20 hover:text-violet-400 hover:border-violet-500/30',
                  'disabled:opacity-30 disabled:cursor-not-allowed',
                  'transition-all duration-200',
                )}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-[12.5px] text-red-400">
              {submitError}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Todo'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

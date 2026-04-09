import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from './ui/sheet'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select } from './ui/select'
import { useCategories } from '@/api/categories'
import { type Todo, type CreateTodoData, type UpdateTodoData, useCreateTodo, useUpdateTodo } from '@/api/todos'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  category_id: z.string(),
  deadline: z.string(),
  priority: z.number().min(0).max(3),
  reminder_at: z.string(),
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

export function TodoFormSheet({ open, onOpenChange, todo }: Props) {
  const { data: categories } = useCategories()
  const createTodo = useCreateTodo()
  const updateTodo = useUpdateTodo()
  const isEdit = !!todo
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    getValues,
    setValue,
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
      })
    } else {
      reset({
        title: '',
        description: '',
        category_id: '',
        deadline: format(new Date(), 'yyyy-MM-dd'),
        priority: 0,
        reminder_at: '',
      })
    }
  }, [open, todo, reset])

  // For new todos: default reminder to deadline at 10:00; keep user's chosen
  // time when deadline changes.
  const deadline = watch('deadline')
  useEffect(() => {
    if (!open || isEdit || !deadline) return
    const current = getValues('reminder_at')
    const timePart = current?.slice(11, 16) || '10:00'
    setValue('reminder_at', `${deadline}T${timePart}`)
  }, [deadline, open, isEdit]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(data: FormData) {
    setSubmitError(null)
    const payload: CreateTodoData = {
      title: data.title,
      description: data.description || undefined,
      category_id: data.category_id || null,
      deadline: data.deadline || undefined,
      priority: data.priority,
      reminder_at: data.reminder_at ? new Date(data.reminder_at).toISOString() : null,
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
                          : 'text-white/25 hover:text-white/45',
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

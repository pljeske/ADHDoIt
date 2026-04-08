import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
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

export function TodoFormSheet({ open, onOpenChange, todo }: Props) {
  const { data: categories } = useCategories()
  const createTodo = useCreateTodo()
  const updateTodo = useUpdateTodo()
  const isEdit = !!todo

  const {
    register,
    handleSubmit,
    reset,
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
        // datetime-local input needs "YYYY-MM-DDTHH:mm" format (first 16 chars of ISO)
        reminder_at: todo.reminder_at ? todo.reminder_at.slice(0, 16) : '',
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

  async function onSubmit(data: FormData) {
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
    } catch (e) {
      console.error('Failed to save todo', e)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetClose onClose={() => onOpenChange(false)} />
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Todo' : 'New Todo'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" autoFocus {...register('title')} placeholder="What needs to be done?" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} placeholder="Optional details..." rows={3} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="deadline">Deadline</Label>
            <Input id="deadline" type="date" {...register('deadline')} />
          </div>

          <div className="space-y-1">
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

          <div className="space-y-1">
            <Label htmlFor="priority">Priority</Label>
            <Select id="priority" {...register('priority', { valueAsNumber: true })}>
              <option value={0}>None</option>
              <option value={1}>Low</option>
              <option value={2}>Medium</option>
              <option value={3}>High</option>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="reminder_at">Reminder</Label>
            <Input id="reminder_at" type="datetime-local" {...register('reminder_at')} />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isEdit ? 'Save Changes' : 'Create Todo'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

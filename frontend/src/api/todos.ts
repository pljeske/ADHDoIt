import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

export interface SubtaskItem {
  id: string
  title: string
  done: boolean
}

export interface Todo {
  id: string
  user_id: string
  category_id: string | null
  title: string
  description: string | null
  deadline: string | null        // "YYYY-MM-DD"
  reminder_at: string | null     // ISO timestamp
  priority: number
  status: 'active' | 'snoozed' | 'done'
  snooze_until: string | null    // "YYYY-MM-DD"
  done_at: string | null
  created_at: string
  updated_at: string
  duration_minutes: number | null
  subtasks: SubtaskItem[]
}

export type TodoView = 'today' | 'upcoming' | 'overdue' | 'done' | 'category'

export interface TodoFilters {
  view?: TodoView
  category_id?: string
}

export function useTodos(filters: TodoFilters = {}) {
  const params = new URLSearchParams()
  if (filters.view) params.set('view', filters.view)
  if (filters.category_id) params.set('category_id', filters.category_id)

  return useQuery({
    queryKey: ['todos', filters.view || 'today', filters.category_id],
    queryFn: () => apiFetch<Todo[]>(`/todos?${params.toString()}`),
  })
}

export interface CreateTodoData {
  title: string
  description?: string
  category_id?: string | null
  deadline?: string
  priority?: number
  reminder_at?: string | null
  duration_minutes?: number | null
  subtasks?: SubtaskItem[]
}

export interface UpdateTodoData {
  title?: string
  description?: string | null
  category_id?: string | null
  deadline?: string
  priority?: number
  reminder_at?: string | null
  duration_minutes?: number | null
  subtasks?: SubtaskItem[]
}

export function useCreateTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTodoData) =>
      apiFetch<Todo>('/todos', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}

export function useUpdateTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateTodoData) =>
      apiFetch<Todo>(`/todos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}

export function useDeleteTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/todos/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}

export function useDoneTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Todo>(`/todos/${id}/done`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}

export function useReopenTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Todo>(`/todos/${id}/reopen`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}

export function useSnoozeTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, snooze_until }: { id: string; snooze_until: string }) =>
      apiFetch<Todo>(`/todos/${id}/snooze`, {
        method: 'POST',
        body: JSON.stringify({ snooze_until }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}

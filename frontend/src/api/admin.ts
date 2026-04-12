import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

export interface AdminUser {
  id: string
  email: string
  name: string
  timezone: string
  role: string
  created_at: string
  updated_at: string
}

export interface AppSettings {
  registration_disabled: boolean
}

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => apiFetch('/admin/users'),
  })
}

export function useAdminUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation<AdminUser, Error, { id: string; role: string }>({
    mutationFn: ({ id, role }) =>
      apiFetch(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useAdminDeleteUser() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch(`/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useAdminSettings() {
  return useQuery<AppSettings>({
    queryKey: ['admin', 'settings'],
    queryFn: () => apiFetch('/admin/settings'),
  })
}

export function useAdminUpdateSettings() {
  const qc = useQueryClient()
  return useMutation<AppSettings, Error, Partial<AppSettings>>({
    mutationFn: (settings) =>
      apiFetch('/admin/settings', { method: 'PATCH', body: JSON.stringify(settings) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] }),
  })
}

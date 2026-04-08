import { apiFetch } from './client'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export interface User {
  id: string
  email: string
  name: string
  timezone: string
}

export interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
}

export async function register(data: {
  email: string
  name: string
  password: string
  timezone: string
}): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Registration failed')
  }
  return res.json()
}

export async function login(data: {
  email: string
  password: string
}): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Login failed')
  }
  return res.json()
}

export async function refreshTokens(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!res.ok) throw new Error('Refresh failed')
  return res.json()
}

export async function logout(refreshToken: string): Promise<void> {
  await apiFetch('/auth/logout', {
    method: 'DELETE',
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
}

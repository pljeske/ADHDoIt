import { useAuthStore, getRefreshToken, setRefreshToken } from '@/store/auth'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { accessToken, setAccessToken, logout } = useAuthStore.getState()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      logout()
      window.location.replace('/login')
      throw new Error('Unauthorized')
    }

    if (isRefreshing) {
      // Wait for ongoing refresh
      return new Promise((resolve, reject) => {
        refreshSubscribers.push(async (newToken: string) => {
          try {
            headers['Authorization'] = `Bearer ${newToken}`
            const retryRes = await fetch(`${BASE_URL}${path}`, {
              ...options,
              headers,
            })
            resolve(await retryRes.json())
          } catch (e) {
            reject(e)
          }
        })
      })
    }

    isRefreshing = true
    try {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (!refreshRes.ok) {
        logout()
        window.location.replace('/login')
        throw new Error('Session expired')
      }

      const data = await refreshRes.json()
      setAccessToken(data.access_token)
      setRefreshToken(data.refresh_token)
      onRefreshed(data.access_token)

      headers['Authorization'] = `Bearer ${data.access_token}`
      const retryRes = await fetch(`${BASE_URL}${path}`, { ...options, headers })
      return retryRes.json()
    } finally {
      isRefreshing = false
    }
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }))
    throw Object.assign(new Error(err.error || 'Request failed'), { status: response.status, code: err.code })
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

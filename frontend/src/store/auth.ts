import { create } from 'zustand'

interface AuthState {
  accessToken: string | null
  role: string | null
  isAuthReady: boolean
  setAccessToken: (token: string | null) => void
  setRole: (role: string | null) => void
  setAuthReady: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  role: null,
  isAuthReady: false,
  setAccessToken: (token) => set({ accessToken: token }),
  setRole: (role) => set({ role }),
  setAuthReady: () => set({ isAuthReady: true }),
  logout: () => {
    set({ accessToken: null, role: null })
    localStorage.removeItem('refresh_token')
  },
}))

export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token')
}

export function setRefreshToken(token: string) {
  localStorage.setItem('refresh_token', token)
}

/** Decode the role claim from a JWT access token without a library. */
export function parseRoleFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded.role ?? null
  } catch {
    return null
  }
}

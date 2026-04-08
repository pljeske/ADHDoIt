import { create } from 'zustand'

interface AuthState {
  accessToken: string | null
  isAuthReady: boolean
  setAccessToken: (token: string | null) => void
  setAuthReady: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isAuthReady: false,
  setAccessToken: (token) => set({ accessToken: token }),
  setAuthReady: () => set({ isAuthReady: true }),
  logout: () => {
    set({ accessToken: null })
    localStorage.removeItem('refresh_token')
  },
}))

export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token')
}

export function setRefreshToken(token: string) {
  localStorage.setItem('refresh_token', token)
}

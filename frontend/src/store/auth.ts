import { create } from 'zustand'

interface AuthState {
  accessToken: string | null
  setAccessToken: (token: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),
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

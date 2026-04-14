import { createRootRoute, Outlet, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuthStore, getRefreshToken, setRefreshToken, parseRoleFromToken } from '@/store/auth'
import { refreshTokens } from '@/api/auth'
import { registerPushSubscription } from '@/lib/sw'

export const rootRoute = createRootRoute({
  component: RootComponent,
})

const PUBLIC_PATHS = ['/login', '/register', '/auth/callback']

function RootComponent() {
  const { setAccessToken, setRole, setAuthReady, logout, isAuthReady } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    const rt = getRefreshToken()
    const currentPath = window.location.pathname

    if (rt) {
      refreshTokens(rt)
        .then((data) => {
          setAccessToken(data.access_token)
          setRole(parseRoleFromToken(data.access_token))
          setRefreshToken(data.refresh_token)
          registerPushSubscription().catch(console.warn)
        })
        .catch(() => {
          logout()
          if (!PUBLIC_PATHS.includes(currentPath)) {
            router.navigate({ to: '/login' })
          }
        })
        .finally(() => {
          setAuthReady()
        })
    } else {
      setAuthReady()
      if (!PUBLIC_PATHS.includes(currentPath)) {
        router.navigate({ to: '/login' })
      }
    }
  }, [])

  // Block all children (and their queries) until auth is resolved
  if (!isAuthReady) {
    return <div className="min-h-[100dvh] bg-[#050505]" />
  }

  return <Outlet />
}

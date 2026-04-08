import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuthStore, getRefreshToken, setRefreshToken } from '@/store/auth'
import { refreshTokens } from '@/api/auth'
import { registerPushSubscription } from '@/lib/sw'

export const rootRoute = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const { setAccessToken, accessToken } = useAuthStore()

  useEffect(() => {
    const rt = getRefreshToken()
    if (rt && !accessToken) {
      refreshTokens(rt)
        .then((data) => {
          setAccessToken(data.access_token)
          setRefreshToken(data.refresh_token)
          registerPushSubscription().catch(console.warn)
        })
        .catch(() => {})
    }
  }, [])

  return <Outlet />
}

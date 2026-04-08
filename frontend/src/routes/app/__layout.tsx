import { createRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { useAuthStore, getRefreshToken } from '@/store/auth'
import { rootRoute } from '../__root'

export const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: () => {
    const { accessToken } = useAuthStore.getState()
    const rt = getRefreshToken()
    if (!accessToken && !rt) {
      throw redirect({ to: '/login' })
    }
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

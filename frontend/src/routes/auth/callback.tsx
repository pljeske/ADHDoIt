import { createRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { rootRoute } from '../__root'
import { useAuthStore, setRefreshToken, parseRoleFromToken } from '@/store/auth'
import { Sparkles } from 'lucide-react'

export const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: AuthCallbackPage,
})

function AuthCallbackPage() {
  const router = useRouter()
  const { setAccessToken, setRole } = useAuthStore()
  const [error, setError] = useState('')

  useEffect(() => {
    // Tokens arrive in the URL fragment — never sent to any server.
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (!accessToken || !refreshToken) {
      setError('Authentication failed — missing tokens.')
      return
    }

    // Clear the fragment so tokens are not visible in the address bar.
    window.history.replaceState(null, '', window.location.pathname)

    setAccessToken(accessToken)
    setRole(parseRoleFromToken(accessToken))
    setRefreshToken(refreshToken)
    router.navigate({ to: '/app/today' })
  }, [])

  if (error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#050505] px-4">
        <div className="w-full max-w-[360px] text-center">
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-[12.5px] text-red-400">
            {error}
          </div>
          <a href="/login" className="mt-4 inline-block text-[12.5px] text-violet-400/80 hover:text-violet-300">
            Back to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#050505]">
      <div className="flex flex-col items-center gap-3 text-white/40">
        <div className="h-10 w-10 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center animate-pulse">
          <Sparkles className="h-5 w-5 text-violet-400" strokeWidth={1.5} />
        </div>
        <p className="text-[13px]">Signing you in…</p>
      </div>
    </div>
  )
}

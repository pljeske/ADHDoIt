import { createRoute, useRouter, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { login } from '@/api/auth'
import { useAuthStore, setRefreshToken, parseRoleFromToken } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { rootRoute } from './__root'
import { useConfig } from '@/api/config'

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  )
}

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type FormData = z.infer<typeof schema>

function LoginPage() {
  const router = useRouter()
  const { setAccessToken, setRole } = useAuthStore()
  const [error, setError] = useState('')
  const { data: config } = useConfig()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError('')
    try {
      const res = await login(data)
      setAccessToken(res.access_token)
      setRole(parseRoleFromToken(res.access_token))
      setRefreshToken(res.refresh_token)
      router.navigate({ to: '/app/today' })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed')
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#050505] px-4">
      {/* Mesh background orb */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/[0.06] blur-[120px]" />
      </div>

      <div className="relative w-full max-w-[360px]">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.15)]">
            <Sparkles className="h-5 w-5 text-violet-400" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-white/90">
              ADHDoIt
            </h1>
            <p className="mt-0.5 text-[13px] text-white/35">
              Sign in to continue
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bezel-outer">
          <div className="bezel-inner p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-[12.5px] text-red-400">
                  {error}
                </div>
              )}

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  {...register('email')}
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p className="mt-1.5 text-[11px] text-red-400/80">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="mt-1.5 text-[11px] text-red-400/80">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </div>
        </div>

        {config?.github_auth_enabled && (
          <>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[11px] text-white/25">or</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <a
              href={`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/auth/github/login`}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[13px] text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white/90"
            >
              <GitHubIcon />
              Continue with GitHub
            </a>
          </>
        )}

        <p className="mt-5 text-center text-[12.5px] text-white/30">
          Don't have an account?{' '}
          <Link to="/register" className="text-violet-400/80 hover:text-violet-300 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

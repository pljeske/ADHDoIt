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

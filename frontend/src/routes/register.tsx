import { createRoute, useRouter, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { register as registerUser } from '@/api/auth'
import { useAuthStore, setRefreshToken, parseRoleFromToken } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { rootRoute } from './__root'

export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
})

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  timezone: z.string(),
})

type FormData = z.infer<typeof schema>

function RegisterPage() {
  const router = useRouter()
  const { setAccessToken, setRole } = useAuthStore()
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
  })

  async function onSubmit(data: FormData) {
    setError('')
    try {
      const res = await registerUser(data)
      setAccessToken(res.access_token)
      setRole(parseRoleFromToken(res.access_token))
      setRefreshToken(res.refresh_token)
      router.navigate({ to: '/app/today' })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#050505] px-4">
      {/* Mesh background orb */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/[0.06] blur-[120px]" />
        <div className="absolute right-0 bottom-1/4 h-[400px] w-[400px] rounded-full bg-indigo-600/[0.04] blur-[100px]" />
      </div>

      <div className="relative w-full max-w-[360px]">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.15)]">
            <Sparkles className="h-5 w-5 text-violet-400" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-white/90">
              Create account
            </h1>
            <p className="mt-0.5 text-[13px] text-white/35">
              Get organized, stay focused
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
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  autoFocus
                  {...register('name')}
                  placeholder="Your name"
                />
                {errors.name && (
                  <p className="mt-1.5 text-[11px] text-red-400/80">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
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
                  {...register('password')}
                  placeholder="Min 8 characters"
                />
                {errors.password && (
                  <p className="mt-1.5 text-[11px] text-red-400/80">{errors.password.message}</p>
                )}
              </div>

              <input type="hidden" {...register('timezone')} />

              <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          </div>
        </div>

        <p className="mt-5 text-center text-[12.5px] text-white/30">
          Already have an account?{' '}
          <Link to="/login" className="text-violet-400/80 hover:text-violet-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

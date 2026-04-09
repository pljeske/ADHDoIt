import { useState, useEffect } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import {
  Calendar,
  CalendarDays,
  AlertCircle,
  CheckSquare,
  LogOut,
  Plus,
  Sparkles,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCategories } from '@/api/categories'
import { useTodos } from '@/api/todos'
import { useAuthStore, getRefreshToken } from '@/store/auth'
import { logout } from '@/api/auth'
import { TodoFormSheet } from './TodoFormSheet'

const navItems = [
  { to: '/app/today' as const, label: 'Today', icon: Calendar },
  { to: '/app/focus' as const, label: 'Focus', icon: Target },
  { to: '/app/upcoming' as const, label: 'Upcoming', icon: CalendarDays },
  { to: '/app/overdue' as const, label: 'Overdue', icon: AlertCircle },
  { to: '/app/done' as const, label: 'Done', icon: CheckSquare },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const [addOpen, setAddOpen] = useState(false)
  const { data: categories } = useCategories()
  const { data: overdueTodos } = useTodos({ view: 'overdue' })
  const overdueCount = overdueTodos?.length ?? 0
  const { logout: storeLogout } = useAuthStore()
  const router = useRouter()

  async function handleLogout() {
    const rt = getRefreshToken()
    if (rt) { try { await logout(rt) } catch {} }
    storeLogout()
    router.navigate({ to: '/login' })
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === 'n' && !e.metaKey && !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) setAddOpen(true)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex min-h-[100dvh] bg-[#050505]">
      {/* ── Sidebar ── */}
      <aside className="flex w-[220px] flex-shrink-0 flex-col p-3 gap-2">
        {/* Logo */}
        <div className="px-3 pt-3 pb-1 flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shadow-glow-sm">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" strokeWidth={1.5} />
          </div>
          <span className="text-[13px] font-semibold tracking-[-0.02em] text-white/90">
            ADHDoIt
          </span>
        </div>

        {/* New Todo button — double-bezel pill */}
        <div className="px-1">
          <div className="bezel-outer">
            <div className="bezel-inner">
              <button
                onClick={() => setAddOpen(true)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[calc(1.25rem-3px)]',
                  'text-[13px] font-medium text-white/80',
                  'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                  'hover:text-white group',
                )}
              >
                <span className={cn(
                  'h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0',
                  'bg-violet-600/30 border border-violet-500/40',
                  'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                  'group-hover:bg-violet-600/50 group-hover:border-violet-400/60',
                  'group-hover:scale-110 group-hover:-translate-y-[1px]',
                )}>
                  <Plus className="h-3 w-3 text-violet-400" strokeWidth={2.5} />
                </span>
                New Todo
                <span className="ml-auto text-[10px] text-white/20 font-mono">N</span>
              </button>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-1 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map(({ to, label, icon: Icon }, i) => (
            <Link
              key={to}
              to={to}
              style={{ animationDelay: `${i * 60}ms` }}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl',
                'text-[13px] font-medium text-white/40',
                'transition-all duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]',
                'hover:bg-white/[0.06] hover:text-white/80',
                '[&.active]:bg-white/[0.08] [&.active]:text-white [&.active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
                'animate-fade-up opacity-0',
              )}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.5} />
              {label}
              {label === 'Overdue' && overdueCount > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/25">
                  {overdueCount > 99 ? '99+' : overdueCount}
                </span>
              )}
            </Link>
          ))}

          {/* Categories */}
          {categories && categories.length > 0 && (
            <div className="pt-4">
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/20">
                Categories
              </p>
              {categories.map((cat, i) => (
                <Link
                  key={cat.id}
                  to="/app/category/$id"
                  params={{ id: cat.id }}
                  style={{ animationDelay: `${(navItems.length + i) * 60}ms` }}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-xl',
                    'text-[13px] font-medium text-white/35',
                    'transition-all duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]',
                    'hover:bg-white/[0.06] hover:text-white/75',
                    '[&.active]:bg-white/[0.08] [&.active]:text-white',
                    'animate-fade-up opacity-0',
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0 ring-1 ring-black/20"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate">{cat.name}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* Logout */}
        <div className="px-1 pb-1">
          <button
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl',
              'text-[12px] font-medium text-white/25',
              'transition-all duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]',
              'hover:bg-red-500/10 hover:text-red-400',
            )}
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto min-h-[100dvh]">
        {children}
      </main>

      <TodoFormSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import {
  Calendar,
  CalendarDays,
  AlertCircle,
  CheckSquare,
  PlusCircle,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCategories } from '@/api/categories'
import { useAuthStore, getRefreshToken } from '@/store/auth'
import { logout } from '@/api/auth'
import { TodoFormSheet } from './TodoFormSheet'
import { Button } from './ui/button'

const navItems = [
  { to: '/app/today' as const, label: 'Today', icon: Calendar },
  { to: '/app/upcoming' as const, label: 'Upcoming', icon: CalendarDays },
  { to: '/app/overdue' as const, label: 'Overdue', icon: AlertCircle },
  { to: '/app/done' as const, label: 'Done', icon: CheckSquare },
]

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [addOpen, setAddOpen] = useState(false)
  const { data: categories } = useCategories()
  const { logout: storeLogout } = useAuthStore()
  const router = useRouter()

  async function handleLogout() {
    const rt = getRefreshToken()
    if (rt) {
      try { await logout(rt) } catch {}
    }
    storeLogout()
    router.navigate({ to: '/login' })
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === 'n' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        setAddOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-56 flex-shrink-0 flex-col border-r bg-card">
        <div className="flex h-14 items-center px-4 font-bold text-lg">
          ADHDoIt
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <div className="space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>

          {categories && categories.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Categories
              </p>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to="/app/category/$id"
                    params={{ id: cat.id }}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
                  >
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate">{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="border-t p-2">
          <Button
            onClick={() => setAddOpen(true)}
            className="w-full justify-start gap-2"
            size="sm"
          >
            <PlusCircle className="h-4 w-4" />
            New Todo
            <span className="ml-auto text-xs opacity-60">N</span>
          </Button>
          <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      <TodoFormSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import {
  Calendar,
  CalendarDays,
  AlertCircle,
  CheckSquare,
  LogOut,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/api/categories'
import { useTodos } from '@/api/todos'
import { useAuthStore, getRefreshToken } from '@/store/auth'
import { logout } from '@/api/auth'
import { TodoFormSheet } from './TodoFormSheet'

const COLOR_SWATCHES = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
]

const navItems = [
  { to: '/app/today' as const, label: 'Today', icon: Calendar },
  { to: '/app/focus' as const, label: 'Focus', icon: Target },
  { to: '/app/upcoming' as const, label: 'Upcoming', icon: CalendarDays },
  { to: '/app/overdue' as const, label: 'Overdue', icon: AlertCircle },
  { to: '/app/done' as const, label: 'Done', icon: CheckSquare },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const [addOpen, setAddOpen] = useState(false)
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(COLOR_SWATCHES[0])
  const newCatInputRef = useRef<HTMLInputElement>(null)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editCatColor, setEditCatColor] = useState(COLOR_SWATCHES[0])
  const editCatInputRef = useRef<HTMLInputElement>(null)
  const { data: categories } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
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
    if (newCatOpen) newCatInputRef.current?.focus()
  }, [newCatOpen])

  useEffect(() => {
    if (editingCatId) editCatInputRef.current?.focus()
  }, [editingCatId])

  function startEditCat(id: string, name: string, color: string) {
    setNewCatOpen(false)
    setEditingCatId(id)
    setEditCatName(name)
    setEditCatColor(color)
  }

  function cancelEditCat() {
    setEditingCatId(null)
    setEditCatName('')
    setEditCatColor(COLOR_SWATCHES[0])
  }

  async function submitEditCat() {
    if (!editingCatId || !editCatName.trim()) return
    await updateCategory.mutateAsync({ id: editingCatId, name: editCatName.trim(), color: editCatColor })
    setEditingCatId(null)
  }

  async function deleteCat(id: string) {
    await deleteCategory.mutateAsync(id)
    if (editingCatId === id) setEditingCatId(null)
  }

  async function submitNewCategory() {
    const name = newCatName.trim()
    if (!name) return
    await createCategory.mutateAsync({ name, color: newCatColor })
    setNewCatName('')
    setNewCatColor(COLOR_SWATCHES[0])
    setNewCatOpen(false)
  }

  function cancelNewCategory() {
    setNewCatName('')
    setNewCatColor(COLOR_SWATCHES[0])
    setNewCatOpen(false)
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
                'text-[13px] font-medium text-white/55',
                'transition-all duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]',
                'hover:bg-white/[0.06] hover:text-white/85',
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
          <div className="pt-4">
            <div className="px-3 pb-1.5 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">
                Categories
              </p>
              <button
                onClick={() => setNewCatOpen((v) => !v)}
                className={cn(
                  'h-4 w-4 flex items-center justify-center rounded-md',
                  'text-white/20 hover:text-white/60 hover:bg-white/[0.06]',
                  'transition-all duration-200',
                  newCatOpen && 'text-violet-400 bg-violet-500/10',
                )}
                title="New category"
              >
                <Plus className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </div>

            {/* Inline new-category form */}
            {newCatOpen && (
              <div className="mx-1 mb-2 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] space-y-2.5">
                <input
                  ref={newCatInputRef}
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); submitNewCategory() }
                    if (e.key === 'Escape') cancelNewCategory()
                  }}
                  placeholder="Category name"
                  className={cn(
                    'w-full bg-transparent text-[12px] text-white/80 placeholder:text-white/25',
                    'border-none outline-none',
                  )}
                />
                <div className="flex items-center gap-1.5">
                  {COLOR_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCatColor(c)}
                      className={cn(
                        'h-4 w-4 rounded-full flex-shrink-0 transition-all duration-150',
                        newCatColor === c
                          ? 'ring-2 ring-white/50 ring-offset-1 ring-offset-[#050505] scale-110'
                          : 'opacity-60 hover:opacity-100',
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={submitNewCategory}
                    disabled={!newCatName.trim() || createCategory.isPending}
                    className={cn(
                      'ml-auto text-[11px] font-medium px-2 py-0.5 rounded-lg',
                      'bg-violet-600/30 text-violet-300 border border-violet-500/30',
                      'hover:bg-violet-600/50 hover:text-violet-200',
                      'disabled:opacity-30 disabled:cursor-not-allowed',
                      'transition-all duration-150',
                    )}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {categories?.map((cat, i) => (
              <div key={cat.id} style={{ animationDelay: `${(navItems.length + i) * 60}ms` }} className="animate-fade-up opacity-0">
                {editingCatId === cat.id ? (
                  <div className="mx-0 mb-1 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] space-y-2.5">
                    <input
                      ref={editCatInputRef}
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); submitEditCat() }
                        if (e.key === 'Escape') cancelEditCat()
                      }}
                      className="w-full bg-transparent text-[12px] text-white/80 placeholder:text-white/25 border-none outline-none"
                    />
                    <div className="flex items-center gap-1.5">
                      {COLOR_SWATCHES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditCatColor(c)}
                          className={cn(
                            'h-4 w-4 rounded-full flex-shrink-0 transition-all duration-150',
                            editCatColor === c
                              ? 'ring-2 ring-white/50 ring-offset-1 ring-offset-[#050505] scale-110'
                              : 'opacity-60 hover:opacity-100',
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={submitEditCat}
                        disabled={!editCatName.trim() || updateCategory.isPending}
                        className={cn(
                          'ml-auto text-[11px] font-medium px-2 py-0.5 rounded-lg',
                          'bg-violet-600/30 text-violet-300 border border-violet-500/30',
                          'hover:bg-violet-600/50 hover:text-violet-200',
                          'disabled:opacity-30 disabled:cursor-not-allowed',
                          'transition-all duration-150',
                        )}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-white/55 transition-all duration-250 hover:bg-white/[0.06] hover:text-white/85 [&:has(a.active)]:bg-white/[0.08] [&:has(a.active)]:text-white">
                    <Link
                      to="/app/category/$id"
                      params={{ id: cat.id }}
                      className="flex items-center gap-2.5 flex-1 min-w-0"
                    >
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0 ring-1 ring-black/20"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate">{cat.name}</span>
                    </Link>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0">
                      <button
                        onClick={() => startEditCat(cat.id, cat.name, cat.color)}
                        className="h-5 w-5 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all duration-150"
                        title="Edit category"
                      >
                        <Pencil className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => deleteCat(cat.id)}
                        disabled={deleteCategory.isPending}
                        className="h-5 w-5 flex items-center justify-center rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 disabled:opacity-30"
                        title="Delete category"
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
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

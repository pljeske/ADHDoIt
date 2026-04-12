import { createRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Shield, Trash2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { appLayoutRoute } from './__layout'
import {
  useAdminUsers,
  useAdminUpdateUserRole,
  useAdminDeleteUser,
  useAdminSettings,
  useAdminUpdateSettings,
  type AdminUser,
} from '@/api/admin'

export const adminRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/app/admin',
  beforeLoad: () => {
    const { role } = useAuthStore.getState()
    if (role !== 'admin') throw redirect({ to: '/app/today' })
  },
  component: AdminPage,
})

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border',
        role === 'admin'
          ? 'bg-violet-500/15 text-violet-300 border-violet-500/25'
          : 'bg-white/[0.05] text-white/40 border-white/[0.08]',
      )}
    >
      {role === 'admin' && <Shield className="h-2.5 w-2.5" strokeWidth={2} />}
      {role}
    </span>
  )
}

function UserRow({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const updateRole = useAdminUpdateUserRole()
  const deleteUser = useAdminDeleteUser()
  const [roleOpen, setRoleOpen] = useState(false)

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
      {/* Avatar placeholder */}
      <div className="h-8 w-8 rounded-full bg-white/[0.07] border border-white/[0.08] flex items-center justify-center flex-shrink-0 text-[12px] font-semibold text-white/50">
        {user.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white/85 truncate">
          {user.name}
          {isSelf && <span className="ml-1.5 text-[11px] text-white/30">(you)</span>}
        </p>
        <p className="text-[11px] text-white/35 truncate">{user.email}</p>
      </div>

      {/* Role badge + dropdown */}
      <div className="relative flex-shrink-0">
        <button
          disabled={isSelf || updateRole.isPending}
          onClick={() => setRoleOpen((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-150',
            isSelf
              ? 'cursor-default'
              : 'hover:bg-white/[0.06] cursor-pointer',
          )}
        >
          <RoleBadge role={user.role} />
          {!isSelf && (
            <ChevronDown className="h-3 w-3 text-white/20" strokeWidth={2} />
          )}
        </button>

        {roleOpen && !isSelf && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setRoleOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 w-28 rounded-xl bg-[#111] border border-white/[0.1] shadow-xl overflow-hidden">
              {(['user', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    updateRole.mutate({ id: user.id, role: r })
                    setRoleOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors',
                    user.role === r
                      ? 'text-violet-300 bg-violet-500/10'
                      : 'text-white/60 hover:bg-white/[0.06] hover:text-white/85',
                  )}
                >
                  {r === 'admin' && <Shield className="h-3 w-3" strokeWidth={1.5} />}
                  {r}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete */}
      <button
        disabled={isSelf || deleteUser.isPending}
        onClick={() => {
          if (confirm(`Delete user "${user.name}"? This cannot be undone.`)) {
            deleteUser.mutate(user.id)
          }
        }}
        className={cn(
          'h-7 w-7 flex items-center justify-center rounded-lg flex-shrink-0 transition-all duration-150',
          isSelf
            ? 'text-white/10 cursor-default'
            : 'text-white/20 hover:text-red-400 hover:bg-red-500/10',
        )}
        title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  )
}

function AdminPage() {
  const { data: users, isLoading: usersLoading } = useAdminUsers()
  const { data: settings, isLoading: settingsLoading } = useAdminSettings()
  const updateSettings = useAdminUpdateSettings()
  const { role: myRole } = useAuthStore()
  const selfId = (() => {
    try {
      const token = useAuthStore.getState().accessToken
      if (!token) return null
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      return payload.user_id ?? null
    } catch {
      return null
    }
  })()

  return (
    <div className="px-8 py-8 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-violet-600/15 border border-violet-500/25 flex items-center justify-center">
          <Shield className="h-4.5 w-4.5 text-violet-400" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-white/90">
            Admin
          </h1>
          <p className="text-[12px] text-white/35">Manage users and app settings</p>
        </div>
      </div>

      {/* Settings */}
      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/35 px-1">
          Settings
        </h2>
        <div className="px-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-white/80">Disable sign-up</p>
              <p className="text-[11px] text-white/35 mt-0.5">
                Prevent new users from creating accounts
              </p>
            </div>
            {settingsLoading ? (
              <div className="h-5 w-9 rounded-full bg-white/[0.07] animate-pulse" />
            ) : (
              <button
                onClick={() =>
                  updateSettings.mutate({
                    registration_disabled: !settings?.registration_disabled,
                  })
                }
                disabled={updateSettings.isPending}
                role="switch"
                aria-checked={settings?.registration_disabled}
                className={cn(
                  'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full p-0',
                  'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  settings?.registration_disabled ? 'bg-violet-600' : 'bg-white/[0.12]',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm',
                    'transition-transform duration-200',
                    settings?.registration_disabled ? 'translate-x-[18px]' : 'translate-x-0.5',
                  )}
                />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Users */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/35">
            Users
          </h2>
          {users && (
            <span className="text-[11px] text-white/25">{users.length} total</span>
          )}
        </div>

        {usersLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[58px] rounded-xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {users?.map((user) => (
              <UserRow key={user.id} user={user} isSelf={user.id === selfId} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

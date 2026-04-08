import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60',
          'transition-opacity duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-[420px]',
          'transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Double-bezel outer shell */}
        <div className="h-full p-2">
          <div
            className={cn(
              'h-full rounded-[1.5rem] overflow-hidden',
              'bg-[#0a0a0a] border border-white/[0.07]',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.1),-8px_0_40px_rgba(0,0,0,0.5)]',
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  )
}

export function SheetContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex h-full flex-col overflow-y-auto p-6 scrollbar-thin', className)}>
      {children}
    </div>
  )
}

export function SheetHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-6">{children}</div>
}

export function SheetTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">
      {children}
    </h2>
  )
}

export function SheetClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className={cn(
        'absolute right-6 top-6 z-10',
        'h-8 w-8 rounded-full',
        'flex items-center justify-center',
        'bg-white/[0.06] text-white/40',
        'border border-white/[0.08]',
        'transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
        'hover:bg-white/[0.1] hover:text-white',
        'active:scale-95',
      )}
    >
      <X className="h-3.5 w-3.5" />
    </button>
  )
}

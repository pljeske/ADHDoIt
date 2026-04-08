import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-11 w-full rounded-xl appearance-none',
          'bg-white/[0.05] border border-white/[0.08]',
          'px-4 py-2.5 text-sm text-white/90',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
          'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500/60',
          'focus-visible:border-violet-500/50',
          'disabled:cursor-not-allowed disabled:opacity-40',
          '[&>option]:bg-[#0e0e0e] [&>option]:text-white',
          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  },
)
Select.displayName = 'Select'

export { Select }

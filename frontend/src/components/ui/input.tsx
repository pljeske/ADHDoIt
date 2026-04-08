import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl',
          'bg-white/[0.05] border border-white/[0.08]',
          'px-4 py-2.5 text-sm text-white/90',
          'placeholder:text-white/25',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
          'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500/60',
          'focus-visible:border-violet-500/50 focus-visible:bg-white/[0.07]',
          'disabled:cursor-not-allowed disabled:opacity-40',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }

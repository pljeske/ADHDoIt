import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[90px] w-full rounded-xl',
          'bg-white/[0.05] border border-white/[0.08]',
          'px-4 py-3 text-sm text-white/90',
          'placeholder:text-white/25',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
          'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500/60',
          'focus-visible:border-violet-500/50 focus-visible:bg-white/[0.07]',
          'disabled:cursor-not-allowed disabled:opacity-40',
          'resize-none',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'

export { Textarea }

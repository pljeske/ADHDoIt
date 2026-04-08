import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-medium text-sm tracking-[-0.01em]',
    'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-40',
    'active:scale-[0.97]',
    'select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'rounded-full',
          'bg-violet-600 text-white',
          'shadow-[0_0_0_1px_rgba(124,58,237,0.5),0_2px_8px_rgba(124,58,237,0.3)]',
          'hover:bg-violet-500 hover:shadow-[0_0_0_1px_rgba(124,58,237,0.7),0_4px_16px_rgba(124,58,237,0.4)]',
          'hover:-translate-y-[1px]',
        ].join(' '),
        secondary: [
          'rounded-full',
          'bg-white/[0.07] text-white/80',
          'ring-1 ring-white/10',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
          'hover:bg-white/[0.11] hover:text-white hover:ring-white/[0.15]',
        ].join(' '),
        destructive: [
          'rounded-full',
          'bg-red-500/20 text-red-400',
          'ring-1 ring-red-500/30',
          'hover:bg-red-500/30 hover:text-red-300',
        ].join(' '),
        outline: [
          'rounded-full',
          'bg-transparent text-white/70',
          'ring-1 ring-white/[0.12]',
          'hover:bg-white/[0.06] hover:text-white hover:ring-white/20',
        ].join(' '),
        ghost: [
          'rounded-xl',
          'bg-transparent text-white/60',
          'hover:bg-white/[0.06] hover:text-white',
        ].join(' '),
        link: 'text-violet-400 underline-offset-4 hover:underline hover:text-violet-300',
      },
      size: {
        default: 'h-10 px-5 py-2.5',
        sm: 'h-8 px-4 py-1.5 text-xs',
        lg: 'h-12 px-7 py-3 text-[15px]',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }

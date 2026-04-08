import * as React from 'react'
import { cn } from '@/lib/utils'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'block text-xs font-medium tracking-[0.04em] uppercase',
        'text-white/40',
        'mb-1.5',
        className,
      )}
      {...props}
    />
  ),
)
Label.displayName = 'Label'

export { Label }

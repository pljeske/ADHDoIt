import { useCategories } from '@/api/categories'
import { cn } from '@/lib/utils'

interface Props {
  categoryId: string | null | undefined
  className?: string
}

export function CategoryBadge({ categoryId, className }: Props) {
  const { data: categories } = useCategories()
  if (!categoryId || !categories) return null

  const cat = categories.find((c) => c.id === categoryId)
  if (!cat) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full',
        'text-[11px] font-medium tracking-[0.03em]',
        'border border-white/[0.08]',
        'transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
        className,
      )}
      style={{
        backgroundColor: `${cat.color}18`,
        color: cat.color,
        borderColor: `${cat.color}30`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: cat.color }}
      />
      {cat.name}
    </span>
  )
}

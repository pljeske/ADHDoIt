import { useCategories } from '@/api/categories'

interface Props {
  categoryId: string | null | undefined
}

export function CategoryBadge({ categoryId }: Props) {
  const { data: categories } = useCategories()
  if (!categoryId || !categories) return null

  const cat = categories.find((c) => c.id === categoryId)
  if (!cat) return null

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: cat.color }}
      />
      {cat.name}
    </span>
  )
}

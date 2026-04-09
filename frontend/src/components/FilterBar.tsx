import { cn } from '@/lib/utils'
import type { Category } from '@/api/categories'

export interface TodoFilters {
  priority: number | null   // null = all
  categoryId: string | null // null = all
}

interface FilterBarProps {
  filters: TodoFilters
  onChange: (f: TodoFilters) => void
  categories?: Category[]
}

const PRIORITY_PILLS = [
  { label: 'All', value: null, color: 'text-white/50' },
  { label: 'Low', value: 1, color: 'text-blue-400' },
  { label: 'Medium', value: 2, color: 'text-amber-400' },
  { label: 'High', value: 3, color: 'text-red-400' },
]

export function FilterBar({ filters, onChange, categories }: FilterBarProps) {
  const hasFilters = filters.priority !== null || filters.categoryId !== null

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <div className="flex items-center gap-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-1">
        {PRIORITY_PILLS.map((p) => (
          <button
            key={String(p.value)}
            type="button"
            onClick={() => onChange({ ...filters, priority: p.value })}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[11px] font-medium',
              'transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
              filters.priority === p.value
                ? 'bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ' + p.color
                : 'text-white/25 hover:text-white/50',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {categories && categories.length > 0 && (
        <select
          value={filters.categoryId ?? ''}
          onChange={(e) => onChange({ ...filters, categoryId: e.target.value || null })}
          className={cn(
            'rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-1.5',
            'text-[11px] font-medium text-white/40 [color-scheme:dark]',
            'focus:outline-none focus:ring-1 focus:ring-violet-500/40',
            'transition-all duration-200',
            filters.categoryId && 'text-white/70',
          )}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      {hasFilters && (
        <button
          type="button"
          onClick={() => onChange({ priority: null, categoryId: null })}
          className="px-2.5 py-1.5 rounded-xl text-[11px] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
        >
          Clear
        </button>
      )}
    </div>
  )
}

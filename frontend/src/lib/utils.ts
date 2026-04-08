import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, isYesterday, isTomorrow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDeadline(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'MMM d')
}

export function isOverdue(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

export const PRIORITY_LABELS = ['None', 'Low', 'Medium', 'High'] as const
export const PRIORITY_COLORS = ['border-gray-300', 'border-blue-400', 'border-amber-400', 'border-red-500'] as const
export const PRIORITY_TEXT_COLORS = ['text-gray-500', 'text-blue-600', 'text-amber-600', 'text-red-600'] as const

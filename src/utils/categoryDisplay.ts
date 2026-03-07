import { CATEGORIES } from '../types'
import type { Expense } from '../types'

export function getCategoryDisplayName(expense: Expense): string {
  const cat = CATEGORIES.find((c) => c.id === expense.categoryId)
  if (expense.categoryId === 'other' && expense.customCategory?.trim()) {
    return expense.customCategory.trim()
  }
  if (cat?.name) return cat.name
  if (expense.customCategory?.trim()) return expense.customCategory.trim()
  return expense.categoryId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

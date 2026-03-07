export type CategoryId = string

export interface Category {
  id: CategoryId
  name: string
  icon: string
  color: string
  isSystem?: boolean
}

export const CATEGORIES: Category[] = [
  { id: 'fuel', name: 'Fuel', icon: '⛽', color: '#eab308', isSystem: true },
  { id: 'food', name: 'Food & Dining', icon: '🍽️', color: '#22c55e', isSystem: true },
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#3b82f6', isSystem: true },
  { id: 'utilities', name: 'Utilities', icon: '💡', color: '#f59e0b', isSystem: true },
  { id: 'shopping', name: 'Shopping', icon: '🛒', color: '#ec4899', isSystem: true },
  { id: 'health', name: 'Health', icon: '❤️', color: '#ef4444', isSystem: true },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#a855f7', isSystem: true },
  { id: 'bills', name: 'Bills', icon: '📄', color: '#06b6d4', isSystem: true },
  { id: 'dad', name: "Dad's Expenses", icon: '👨', color: '#0ea5e9', isSystem: true },
  { id: 'other', name: 'Other', icon: '📌', color: '#71717a', isSystem: true },
]

export interface FuelInfo {
  volumeLiters?: number
  pricePerLiter?: number
  odometerKm?: number
  fuelType?: 'petrol' | 'diesel' | 'electric' | 'other'
}

export interface Expense {
  id: string
  amount: number
  currency: string
  categoryId: CategoryId
  customCategory?: string // When categoryId is 'other', user can specify
  note: string
  merchant?: string
  reference?: string // Receipt/invoice number
  date: string // ISO
  createdAt: string
  photoDataUrl?: string
  fuel?: FuelInfo
}

export interface MonthlySummary {
  year: number
  month: number
  total: number
  byCategory: Record<string, number>
  expenseCount: number
  fuelTotal?: number
}

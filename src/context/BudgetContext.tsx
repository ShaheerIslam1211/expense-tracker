import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const BUDGET_STORAGE_KEY = 'expense-tracker-budget'
const DEFAULT_MONTHLY_BUDGET = 60_000

function loadBudget(): number {
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY)
    if (raw == null) return DEFAULT_MONTHLY_BUDGET
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_MONTHLY_BUDGET
  } catch {
    return DEFAULT_MONTHLY_BUDGET
  }
}

function saveBudget(value: number) {
  localStorage.setItem(BUDGET_STORAGE_KEY, String(value))
}

interface BudgetContextValue {
  monthlyBudget: number
  setMonthlyBudget: (value: number) => void
  /** How much over budget this month (0 if under). */
  overBy: (year: number, month: number, totalSpent: number) => number
  /** Remaining budget (can be negative if over). */
  remaining: (year: number, month: number, totalSpent: number) => number
}

const BudgetContext = createContext<BudgetContextValue | null>(null)

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [monthlyBudget, setMonthlyBudgetState] = useState(loadBudget)

  const setMonthlyBudget = useCallback((value: number) => {
    const safe = Math.max(0, Math.round(value))
    setMonthlyBudgetState(safe)
    saveBudget(safe)
  }, [])

  const remaining = useCallback(
    (_year: number, _month: number, totalSpent: number) => {
      return monthlyBudget - totalSpent
    },
    [monthlyBudget]
  )

  const overBy = useCallback(
    (_year: number, _month: number, totalSpent: number) => {
      const rem = monthlyBudget - totalSpent
      return rem < 0 ? Math.abs(rem) : 0
    },
    [monthlyBudget]
  )

  const value = useMemo(
    () => ({
      monthlyBudget,
      setMonthlyBudget,
      overBy,
      remaining,
    }),
    [monthlyBudget, setMonthlyBudget, overBy, remaining]
  )

  return (
    <BudgetContext.Provider value={value}>
      {children}
    </BudgetContext.Provider>
  )
}

export function useBudget() {
  const ctx = useContext(BudgetContext)
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider')
  return ctx
}

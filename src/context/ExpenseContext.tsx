import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { v4 as uuidv4 } from 'uuid'
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
import type { Expense, CategoryId, MonthlySummary } from '../types'
import { db } from '../firebase'
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { useAuth } from './AuthContext'
import { useCategories } from './CategoryContext'

interface ExpenseContextValue {
  expenses: Expense[]
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void
  updateExpense: (id: string, updates: Partial<Expense>) => void
  deleteExpense: (id: string) => void
  getExpensesByMonth: (year: number, month: number) => Expense[]
  getMonthlySummaries: (year: number) => MonthlySummary[]
  getCategoryTotal: (year: number, month: number, categoryId: CategoryId) => number
  getFuelExpenses: (year?: number, month?: number) => Expense[]
  totalSpent: (year?: number, month?: number) => number
}

const ExpenseContext = createContext<ExpenseContextValue | null>(null)

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { categories } = useCategories()
  const [expenses, setExpenses] = useState<Expense[]>([])

  useEffect(() => {
    if (!user) {
      setExpenses([])
      return
    }
    const q = query(
      collection(db, 'users', user.uid, 'expenses'),
      orderBy('date', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      const next: Expense[] = snap.docs.map((d) => {
        const data = d.data() as Omit<Expense, 'id'>
        return {
          id: d.id,
          ...data,
        }
      })
      setExpenses(next)
    })
    return () => unsub()
  }, [user])

  const addExpense = useCallback(
    (expense: Omit<Expense, 'id' | 'createdAt'>) => {
      if (!user) return
      const newExpense: Expense = {
        ...expense,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      }
      const clean = Object.fromEntries(
        Object.entries(newExpense).filter(([, v]) => v !== undefined)
      ) as Expense
      void addDoc(collection(db, 'users', user.uid, 'expenses'), clean)
    },
    [user]
  )

  const updateExpense = useCallback(
    (id: string, updates: Partial<Expense>) => {
      if (!user) return
      const ref = doc(db, 'users', user.uid, 'expenses', id)
      const clean: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined) clean[k] = deleteField()
        else clean[k] = v
      }
      void updateDoc(ref, clean)
    },
    [user]
  )

  const deleteExpense = useCallback(
    (id: string) => {
      if (!user) return
      const ref = doc(db, 'users', user.uid, 'expenses', id)
      void deleteDoc(ref)
    },
    [user]
  )

  const getExpensesByMonth = useCallback(
    (year: number, month: number) => {
      const start = startOfMonth(new Date(year, month - 1))
      const end = endOfMonth(start)
      return expenses.filter((e) => {
        const d = parseISO(e.date)
        return isWithinInterval(d, { start, end })
      })
    },
    [expenses]
  )

  const getMonthlySummaries = useCallback(
    (year: number): MonthlySummary[] => {
      const result: MonthlySummary[] = []
      for (let month = 1; month <= 12; month++) {
        const list = getExpensesByMonth(year, month)
        const total = list.reduce((s, e) => s + e.amount, 0)
        const byCategory = categories.reduce(
          (acc, c) => {
            acc[c.id] = list
              .filter((e) => e.categoryId === c.id)
              .reduce((s, e) => s + e.amount, 0)
            return acc
          }, {} as Record<string, number>
        )
        const fuelTotal = list
          .filter((e) => e.categoryId === 'fuel')
          .reduce((s, e) => s + e.amount, 0)
        result.push({
          year,
          month,
          total,
          byCategory,
          expenseCount: list.length,
          fuelTotal: fuelTotal || undefined,
        })
      }
      return result
    },
    [getExpensesByMonth, categories]
  )

  const getCategoryTotal = useCallback(
    (year: number, month: number, categoryId: CategoryId) => {
      return getExpensesByMonth(year, month)
        .filter((e) => e.categoryId === categoryId)
        .reduce((s, e) => s + e.amount, 0)
    },
    [getExpensesByMonth]
  )

  const getFuelExpenses = useCallback(
    (year?: number, month?: number) => {
      let list = expenses.filter((e) => e.categoryId === 'fuel')
      if (year != null) {
        list = list.filter((e) => {
          const d = parseISO(e.date)
          return d.getFullYear() === year
        })
        if (month != null) {
          list = list.filter((e) => parseISO(e.date).getMonth() + 1 === month)
        }
      }
      return list.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    },
    [expenses]
  )

  const totalSpent = useCallback(
    (year?: number, month?: number) => {
      let list = expenses
      if (year != null) {
        list = list.filter((e) => parseISO(e.date).getFullYear() === year)
        if (month != null) {
          list = list.filter(
            (e) => parseISO(e.date).getMonth() + 1 === month
          )
        }
      }
      return list.reduce((s, e) => s + e.amount, 0)
    },
    [expenses]
  )

  const value = useMemo(
    () => ({
      expenses,
      addExpense,
      updateExpense,
      deleteExpense,
      getExpensesByMonth,
      getMonthlySummaries,
      getCategoryTotal,
      getFuelExpenses,
      totalSpent,
    }),
    [
      expenses,
      addExpense,
      updateExpense,
      deleteExpense,
      getExpensesByMonth,
      getMonthlySummaries,
      getCategoryTotal,
      getFuelExpenses,
      totalSpent,
    ]
  )

  return (
    <ExpenseContext.Provider value={value}>
      {children}
    </ExpenseContext.Provider>
  )
}

export function useExpenses() {
  const ctx = useContext(ExpenseContext)
  if (!ctx) throw new Error('useExpenses must be used within ExpenseProvider')
  return ctx
}

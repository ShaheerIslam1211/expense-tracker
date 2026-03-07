import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format, startOfMonth, subMonths } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useExpenses } from '../context/ExpenseContext'
import { useBudget } from '../context/BudgetContext'
import { useCategories } from '../context/CategoryContext'
import { formatPkr } from '../utils/currency'

export default function Dashboard() {
  const [monthOffset, setMonthOffset] = useState(0)
  const { getExpensesByMonth, getMonthlySummaries, totalSpent } = useExpenses()
  const { categories } = useCategories()
  const { monthlyBudget, overBy, remaining } = useBudget()

  const base = startOfMonth(subMonths(new Date(), monthOffset))
  const year = base.getFullYear()
  const month = base.getMonth() + 1
  const expenses = getExpensesByMonth(year, month)
  const total = totalSpent(year, month)
  const summaries = getMonthlySummaries(year)
  const overAmount = overBy(year, month, total)
  const remainingAmount = remaining(year, month, total)

  const barData = summaries
    .filter((s) => s.total > 0)
    .map((s) => ({
      name: format(new Date(s.year, s.month - 1), 'MMM'),
      total: s.total,
      fuel: s.fuelTotal ?? 0,
    }))

  const pieData = categories.map((c) => ({
    name: c.name,
    value: expenses
      .filter((e) => e.categoryId === c.id)
      .reduce((s, e) => s + e.amount, 0),
    color: c.color,
  })).filter((d) => d.value > 0)

  const topCategories = [...pieData].sort((a, b) => b.value - a.value).slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMonthOffset((o) => o + 1)}
            className="p-2 rounded-lg bg-[var(--surface-hover)]"
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="min-w-[140px] text-center font-medium">
            {format(base, 'MMMM yyyy')}
          </span>
          <button
            type="button"
            onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
            className="p-2 rounded-lg bg-[var(--surface-hover)] disabled:opacity-50"
            disabled={monthOffset === 0}
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 space-y-3">
        <p className="text-sm text-[var(--text-muted)]">Monthly budget (PKR)</p>
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <span className="text-2xl font-bold text-[var(--accent)]">
            {formatPkr(total)}
          </span>
          <span className="text-sm text-[var(--text-muted)]">
            of {formatPkr(monthlyBudget)}
          </span>
        </div>
        <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all min-w-0"
            style={{
              width: `${Math.min(100, (total / monthlyBudget) * 100)}%`,
              backgroundColor: overAmount > 0 ? 'var(--danger)' : 'var(--accent)',
            }}
          />
        </div>
        {overAmount > 0 ? (
          <p className="text-sm font-medium text-[var(--danger)]">
            Over by {formatPkr(overAmount)} this month
          </p>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            {formatPkr(Math.max(0, remainingAmount))} left in budget
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--text-muted)]">This month</p>
          <p className="text-xl font-bold text-[var(--accent)]">
            {formatPkr(total)}
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Expenses</p>
          <p className="text-xl font-bold">{expenses.length}</p>
        </div>
      </div>

      <Link
        to="/add"
        className="block w-full py-3 rounded-xl bg-[var(--accent)] text-white text-center font-medium hover:opacity-90 transition"
      >
        + Add expense
      </Link>

      {expenses.length > 0 ? (
        <>
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
            <h3 className="font-medium mb-3">Spending by category</h3>
            <div className="h-64">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | undefined) =>
                        formatPkr(value ?? 0)
                      }
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-[var(--text-muted)] text-sm text-center py-8">
                  No data for this month
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
            <h3 className="font-medium mb-3">Monthly trend ({year})</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `Rs ${v / 1000}k`} />
                  <Tooltip
                    formatter={(value: number | undefined) =>
                      (value ?? 0).toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0,
                      })
                    }
                  />
                  <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
            <h3 className="font-medium mb-3">Top categories</h3>
            <ul className="space-y-2">
              {topCategories.map((c) => {
                const pct = total > 0 ? (c.value / total) * 100 : 0
                return (
                  <li key={c.name} className="flex items-center gap-3">
                    <div
                      className="w-2 h-8 rounded"
                      style={{ backgroundColor: c.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: c.color,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium whitespace-nowrap">
                      {formatPkr(c.value)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      ) : (
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-8 text-center text-[var(--text-muted)]">
          <p className="mb-4">No expenses this month yet.</p>
          <Link
            to="/add"
            className="inline-block py-2 px-4 rounded-lg bg-[var(--accent)] text-white"
          >
            Add your first expense
          </Link>
        </div>
      )}
    </div>
  )
}

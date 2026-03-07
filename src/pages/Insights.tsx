import { useState } from 'react'
import { format } from 'date-fns'
import {
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Legend,
} from 'recharts'
import { useExpenses } from '../context/ExpenseContext'
import { useCategories } from '../context/CategoryContext'
import { formatPkr } from '../utils/currency'
import { getCategoryDisplayName } from '../utils/categoryDisplay'

export default function Insights() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { getMonthlySummaries, totalSpent, expenses } = useExpenses()
  const { categories } = useCategories()
  const summaries = getMonthlySummaries(year)
  const yearTotal = totalSpent(year)
  const yearExpenses = expenses.filter((e) => new Date(e.date).getFullYear() === year)

  const exportCsv = () => {
    const headers = ['Date', 'Category', 'Amount (Rs)', 'Merchant', 'Note', 'Ref#', 'Fuel (L)', 'Odometer (km)']
    const rows = yearExpenses
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((e) => {
        const cat = getCategoryDisplayName(e)
        return [
          format(new Date(e.date), 'yyyy-MM-dd'),
          cat,
          e.amount,
          e.merchant || '',
          e.note || '',
          e.reference ?? '',
          e.fuel?.volumeLiters ?? '',
          e.fuel?.odometerKm ?? '',
        ]
      })
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const monthlyData = summaries.map((s) => ({
    // Keep legacy stacked bars while grouping any custom/dynamic categories under "other".
    name: format(new Date(s.year, s.month - 1), 'MMM'),
    total: s.total,
    fuel: s.fuelTotal ?? 0,
    food: s.byCategory.food ?? 0,
    transport: s.byCategory.transport ?? 0,
    shopping: s.byCategory.shopping ?? 0,
    bills: s.byCategory.bills ?? 0,
    dad: s.byCategory.dad ?? 0,
    other: Math.max(
      0,
      s.total -
        ((s.fuelTotal ?? 0) +
          (s.byCategory.food ?? 0) +
          (s.byCategory.transport ?? 0) +
          (s.byCategory.shopping ?? 0) +
          (s.byCategory.bills ?? 0) +
          (s.byCategory.dad ?? 0))
    ),
  }))

  const categoryTotals = categories.map((c) => ({
    name: c.name,
    id: c.id,
    total: summaries.reduce((s, m) => s + (m.byCategory[c.id] ?? 0), 0),
    color: c.color,
  })).filter((d) => d.total > 0)

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Insights</h2>
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={exportCsv}
            className="px-3 py-2 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-sm font-medium"
          >
            Export CSV
          </button>
          <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        </div>
      </div>

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
        <p className="text-sm text-[var(--text-muted)]">Total spending in {year}</p>
        <p className="text-3xl font-bold text-[var(--accent)]">
          {formatPkr(yearTotal)}
        </p>
      </div>

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
        <h3 className="font-medium mb-3">Monthly breakdown by category</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData}>
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `Rs ${v / 1000}k`} />
              <Tooltip
                formatter={(value: number | undefined) =>
                  formatPkr(value ?? 0)
                }
              />
              <Legend />
              <Bar dataKey="fuel" stackId="a" fill="var(--chart-2)" name="Fuel" />
              <Bar dataKey="food" stackId="a" fill="var(--chart-1)" name="Food" />
              <Bar dataKey="transport" stackId="a" fill="var(--chart-3)" name="Transport" />
              <Bar dataKey="shopping" stackId="a" fill="var(--chart-5)" name="Shopping" />
              <Bar dataKey="bills" stackId="a" fill="var(--chart-4)" name="Bills" />
              <Bar dataKey="dad" stackId="a" fill="#0ea5e9" name="Dad" />
              <Bar dataKey="other" stackId="a" fill="var(--text-muted)" name="Other" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
        <h3 className="font-medium mb-3">Monthly trend</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `Rs ${v / 1000}k`} />
              <Tooltip
                formatter={(value: number | undefined) =>
                  formatPkr(value ?? 0)
                }
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ fill: 'var(--accent)' }}
                name="Total"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
        <h3 className="font-medium mb-3">Category share (full year)</h3>
        <ul className="space-y-3">
          {categoryTotals
            .sort((a, b) => b.total - a.total)
            .map((c) => {
              const pct = yearTotal > 0 ? (c.total / yearTotal) * 100 : 0
              return (
                <li key={c.id} className="flex items-center gap-3">
                  <div
                    className="w-3 h-8 rounded flex-shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.name}</p>
                    <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
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
                    {formatPkr(c.total)}
                    <span className="text-[var(--text-muted)] font-normal">
                      {' '}
                      ({pct.toFixed(0)}%)
                    </span>
                  </span>
                </li>
              )
            })}
        </ul>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { useExpenses } from '../context/ExpenseContext'
import { Link } from 'react-router-dom'
import { formatPkr } from '../utils/currency'

export default function Fuel() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { getFuelExpenses, getMonthlySummaries } = useExpenses()
  const fuelExpenses = getFuelExpenses(year)
  const summaries = getMonthlySummaries(year)
  const fuelByMonth = summaries.map((s) => ({
    name: format(new Date(s.year, s.month - 1), 'MMM'),
    amount: s.fuelTotal ?? 0,
    count: fuelExpenses.filter(
      (e) => parseISO(e.date).getMonth() + 1 === s.month
    ).length,
  }))

  const totalFuel = fuelExpenses.reduce((s, e) => s + e.amount, 0)
  const totalVolume = fuelExpenses.reduce(
    (s, e) => s + (e.fuel?.volumeLiters ?? 0),
    0
  )
  const avgPrice =
    fuelExpenses.filter((e) => e.fuel?.pricePerLiter).length > 0
      ? fuelExpenses.reduce((s, e) => s + (e.fuel?.pricePerLiter ?? 0), 0) /
        fuelExpenses.filter((e) => e.fuel?.pricePerLiter).length
      : null

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-semibold">Fuel tracking</h2>
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

      <Link
        to="/add"
        className="block w-full py-3 rounded-xl bg-[var(--fuel)] text-white text-center font-medium hover:opacity-90 transition"
      >
        + Add fuel expense
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Total spent ({year})</p>
          <p className="text-xl font-bold text-[var(--fuel)]">
            {formatPkr(totalFuel)}
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Fill-ups</p>
          <p className="text-xl font-bold">{fuelExpenses.length}</p>
        </div>
        {totalVolume > 0 && (
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 col-span-2">
            <p className="text-sm text-[var(--text-muted)]">Total volume</p>
            <p className="text-xl font-bold">
              {totalVolume.toFixed(1)} L
              {avgPrice != null && (
                <span className="text-sm font-normal text-[var(--text-muted)]">
                  {' '}
                  · Avg Rs {avgPrice.toFixed(1)}/L
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {fuelByMonth.some((d) => d.amount > 0) && (
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
          <h3 className="font-medium mb-3">Monthly fuel spend</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fuelByMonth}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `Rs ${v / 1000}k`} />
                <Tooltip
                  formatter={(value: number | undefined) =>
                    formatPkr(value ?? 0)
                  }
                />
                <Bar
                  dataKey="amount"
                  fill="var(--fuel)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
        <h3 className="font-medium mb-3">Recent fill-ups</h3>
        {fuelExpenses.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm">
            No fuel expenses in {year}. Add one to start tracking.
          </p>
        ) : (
          <ul className="space-y-2">
            {fuelExpenses.slice(0, 10).map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
              >
                <div>
                  <p className="font-medium">
                    {formatPkr(e.amount)}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {format(parseISO(e.date), 'dd MMM yyyy')}
                    {e.fuel?.volumeLiters != null && (
                      <> · {e.fuel.volumeLiters} L</>
                    )}
                    {e.fuel?.odometerKm != null && (
                      <> · {e.fuel.odometerKm} km</>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

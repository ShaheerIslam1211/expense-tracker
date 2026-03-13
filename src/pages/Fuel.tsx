import { useState } from "react";
import { format, parseISO } from "date-fns";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useExpenses } from "../context/ExpenseContext";
import { Link } from "react-router-dom";
import { useCurrency } from "../hooks/useCurrency";

export default function Fuel() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { getFuelExpenses, getMonthlySummaries } = useExpenses();
  const { formatAmount } = useCurrency();
  const fuelExpenses = getFuelExpenses(year);
  const summaries = getMonthlySummaries(year);
  const fuelByMonth = summaries.map((s) => ({
    name: format(new Date(s.year, s.month - 1), "MMM"),
    amount: s.fuelTotal ?? 0,
    count: fuelExpenses.filter((e) => parseISO(e.date).getMonth() + 1 === s.month).length,
  }));

  const totalFuel = fuelExpenses.reduce((s, e) => s + e.amount, 0);
  const totalVolume = fuelExpenses.reduce((s, e) => s + (e.fuel?.volumeLiters ?? 0), 0);
  const avgPrice =
    fuelExpenses.filter((e) => e.fuel?.pricePerLiter).length > 0
      ? fuelExpenses.reduce((s, e) => s + (e.fuel?.pricePerLiter ?? 0), 0) /
        fuelExpenses.filter((e) => e.fuel?.pricePerLiter).length
      : null;

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text)]">Fuel Tracking</h2>
          <p className="text-sm text-[var(--text-muted)]">Monitor your vehicle expenses</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] font-semibold shadow-sm focus:ring-2 focus:ring-[var(--fuel)] outline-none transition-all"
        >
          {years.map((y) => (
            <option
              key={y}
              value={y}
            >
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-[var(--text-muted)] font-medium">Total Fuel Spent ({year})</p>
              <h3 className="text-3xl font-bold mt-1 text-[var(--fuel)]">{formatAmount(totalFuel)}</h3>
            </div>
            <div className="px-3 py-1 rounded-full bg-[var(--fuel)]/10 text-[var(--fuel)] text-xs font-bold uppercase tracking-wider">
              Yearly Stats
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">Total Volume</p>
              <p className="text-xl font-bold mt-1">{totalVolume.toFixed(1)} L</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">Avg Price/L</p>
              <p className="text-xl font-bold mt-1">{avgPrice ? `Rs ${avgPrice.toFixed(1)}` : "N/A"}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">Total Fill-ups</p>
              <p className="text-xl font-bold mt-1">{fuelExpenses.length}</p>
            </div>
            <span className="text-3xl">⛽</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Link
            to="/add"
            className="flex-1 flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-[var(--fuel)] text-white shadow-lg hover:opacity-90 transition-opacity"
          >
            <span className="text-3xl">⛽</span>
            <span className="font-bold">Add Fuel Expense</span>
          </Link>
          <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
            <p className="text-sm text-[var(--text-muted)] mb-4 font-bold uppercase tracking-wider">
              Monthly Breakdown
            </p>
            <div className="space-y-3 max-h-[120px] overflow-y-auto no-scrollbar">
              {fuelByMonth
                .filter((m) => m.amount > 0)
                .map((m, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-[var(--text-muted)]">{m.name}</span>
                    <span className="font-bold">{formatAmount(m.amount)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {fuelByMonth.some((d) => d.amount > 0) && (
        <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Fuel Spend Trend</h3>
          <div className="h-64">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={300}
              minHeight={200}
            >
              <BarChart data={fuelByMonth}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "var(--surface-hover)" }}
                  contentStyle={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                  }}
                  formatter={(value: number | undefined) => value ? formatAmount(value) : "0"}
                />
                <Bar
                  dataKey="amount"
                  fill="var(--fuel)"
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {fuelExpenses.length > 0 && (
        <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Recent Fill-ups</h3>
          <div className="space-y-4">
            {fuelExpenses.slice(0, 5).map((e, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--fuel)]/10 flex items-center justify-center text-xl">
                    ⛽
                  </div>
                  <div>
                    <p className="font-bold text-sm">{format(parseISO(e.date), "dd MMM yyyy")}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {e.fuel?.volumeLiters ? `${e.fuel.volumeLiters}L @ Rs ${e.fuel.pricePerLiter}/L` : "No details"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[var(--fuel)]">{formatAmount(e.amount)}</p>
                  {e.fuel?.odometerKm && (
                    <p className="text-[10px] text-[var(--text-muted)] uppercase">{e.fuel.odometerKm} km</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

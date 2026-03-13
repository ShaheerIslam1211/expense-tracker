import { useState } from "react";
import { format } from "date-fns";
import { Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Legend, Cell, PieChart, Pie } from "recharts";
import { useExpenses } from "../context/ExpenseContext";
import { useCategories } from "../context/CategoryContext";
import { useCurrency } from "../hooks/useCurrency";
import { exportToCSV, exportToPDF } from "../utils/export";
import { FileText, Download, TrendingUp, Wallet, PieChart as PieChartIcon } from "lucide-react";

export default function Insights() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { getMonthlySummaries, totalSpent, expenses } = useExpenses();
  const { categories } = useCategories();
  const { formatAmount } = useCurrency();
  const summaries = getMonthlySummaries(year);
  const yearTotal = totalSpent(year);
  const yearExpenses = expenses.filter((e) => new Date(e.date).getFullYear() === year);

  const monthlyData = summaries.map((s) => ({
    name: format(new Date(s.year, s.month - 1), "MMM"),
    total: s.total,
    cash: s.cashTotal || 0,
    card: s.cardTotal || 0,
  }));

  const categoryTotals = categories
    .map((c) => ({
      name: c.name,
      value: summaries.reduce((s, m) => s + (m.byCategory[c.id] ?? 0), 0),
      color: c.color,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-10 animate-in p-4 md:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Financial Insights</h1>
          <p className="text-muted-foreground mt-1 font-medium">Deep dive into your spending patterns for {year}.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-card border border-border rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => exportToCSV(yearExpenses)}
              className="px-4 py-2 hover:bg-accent rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              onClick={() => exportToPDF(yearExpenses)}
              className="px-4 py-2 hover:bg-accent rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-6 py-3 rounded-2xl bg-card border border-border font-black text-xs uppercase tracking-widest shadow-sm focus:ring-2 focus:ring-primary outline-none transition-all"
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 rounded-[2.5rem] bg-card border border-border p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="h-48 w-48 text-primary" />
          </div>

          <div className="relative z-10 flex justify-between items-start mb-10">
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                Total Yearly Spending
              </p>
              <h3 className="text-4xl font-black text-foreground">{formatAmount(yearTotal)}</h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                Avg Monthly
              </p>
              <p className="text-xl font-black text-foreground">{formatAmount(yearTotal / (summaries.length || 1))}</p>
            </div>
          </div>

          <div className="h-80 relative z-10">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <ComposedChart data={monthlyData}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 12, fontWeight: "bold" }}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "var(--accent)", opacity: 0.1 }}
                  contentStyle={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "16px",
                    fontWeight: "bold",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value: number | undefined) => [value ? formatAmount(value) : "0", ""]}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: 20, fontWeight: "bold", textTransform: "uppercase", fontSize: 10 }}
                />
                <Bar
                  dataKey="cash"
                  name="Cash"
                  fill="var(--success)"
                  radius={[6, 6, 0, 0]}
                  stackId="a"
                  barSize={30}
                />
                <Bar
                  dataKey="card"
                  name="Card"
                  fill="var(--accent)"
                  radius={[6, 6, 0, 0]}
                  stackId="a"
                  barSize={30}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[2.5rem] bg-card border border-border p-8 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">🏆</div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">
                Top Category
              </p>
              <h4 className="font-black text-2xl text-foreground">{categoryTotals[0]?.name || "N/A"}</h4>
              <p className="text-primary font-black text-3xl mt-2">
                {categoryTotals[0] ? formatAmount(categoryTotals[0].value) : "0"}
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-border">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">
              Payment Method Split
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-accent/10 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="h-3 w-3 text-success" />
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Cash</p>
                </div>
                <p className="text-xl font-black">
                  {Math.round((summaries.reduce((s, m) => s + (m.cashTotal || 0), 0) / (yearTotal || 1)) * 100)}%
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-accent/10 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-3 w-3 text-primary" />
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Card</p>
                </div>
                <p className="text-xl font-black">
                  {Math.round((summaries.reduce((s, m) => s + (m.cardTotal || 0), 0) / (yearTotal || 1)) * 100)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-[2.5rem] bg-card border border-border p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <PieChartIcon className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Yearly Distribution</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={categoryTotals}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {categoryTotals.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "16px",
                    fontWeight: "bold",
                  }}
                  formatter={(value: number | undefined) => (value ? formatAmount(value) : "0")}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  wrapperStyle={{ fontWeight: "bold", fontSize: 10, textTransform: "uppercase" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[2.5rem] bg-card border border-border p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Category Breakdown</h3>
          </div>
          <div className="space-y-6 max-h-[320px] overflow-y-auto pr-4 no-scrollbar">
            {categoryTotals.map((cat, i) => (
              <div
                key={i}
                className="space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-black text-sm text-foreground uppercase tracking-wider">{cat.name}</span>
                  </div>
                  <span className="font-black text-sm">{formatAmount(cat.value)}</span>
                </div>
                <div className="h-2 bg-accent/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${(cat.value / yearTotal) * 100}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

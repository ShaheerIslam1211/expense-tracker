import { useState } from "react";
import { format } from "date-fns";
import { Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Legend, Cell, PieChart, Pie } from "recharts";
import { useExpenses } from "../context/ExpenseContext";
import { useCategories } from "../context/CategoryContext";
import { useCurrency } from "../hooks/useCurrency";
import { exportToCSV, exportToPDF } from "../utils/export";
import { FileText, Download, TrendingUp, Wallet, PieChart as PieChartIcon } from "lucide-react";
import { useIsMobile } from "../hooks/useIsMobile";

export default function Insights() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { getMonthlySummaries, totalSpent, expenses } = useExpenses();
  const { categories } = useCategories();
  const { formatAmount } = useCurrency();
  const isMobile = useIsMobile();
  const summaries = getMonthlySummaries(year);
  const yearTotal = totalSpent(year);
  const yearExpenses = expenses.filter((e) => new Date(e.date).getFullYear() === year);
  const yearIncome = yearExpenses.filter((e) => e.type === "income").reduce((sum, e) => sum + e.amount, 0);
  const yearExpenseOnly = yearExpenses.filter((e) => e.type === "expense");
  const savingsRate = yearIncome > 0 ? ((yearIncome - yearTotal) / yearIncome) * 100 : 0;

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
  const topCategory = categoryTotals[0];
  const topCategoryShare = yearTotal > 0 && topCategory ? (topCategory.value / yearTotal) * 100 : 0;

  const dailyExpenseTotals = yearExpenseOnly.reduce<Record<string, number>>((acc, expense) => {
    const key = expense.date.slice(0, 10);
    acc[key] = (acc[key] || 0) + expense.amount;
    return acc;
  }, {});

  const dailyEntries = Object.entries(dailyExpenseTotals);
  const topSpendDay = dailyEntries.sort((a, b) => b[1] - a[1])[0];

  // No-spend streak analytics
  const now = new Date();
  const start = new Date(year, 0, 1);
  const end = year === now.getFullYear() ? now : new Date(year, 11, 31);
  let cursor = new Date(start);
  let currentNoSpendStreak = 0;
  let longestNoSpendStreak = 0;
  let runningStreak = 0;
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    const spent = dailyExpenseTotals[key] || 0;
    if (spent === 0) {
      runningStreak += 1;
      if (runningStreak > longestNoSpendStreak) longestNoSpendStreak = runningStreak;
    } else {
      runningStreak = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  // Calculate current streak by looking backwards from end date.
  const reverse = new Date(end);
  while (reverse >= start) {
    const key = reverse.toISOString().slice(0, 10);
    if ((dailyExpenseTotals[key] || 0) > 0) break;
    currentNoSpendStreak += 1;
    reverse.setDate(reverse.getDate() - 1);
  }

  // Anomaly detection with simple z-score style threshold
  const expenseValues = yearExpenseOnly.map((e) => e.amount);
  const avgExpense = expenseValues.length ? expenseValues.reduce((s, v) => s + v, 0) / expenseValues.length : 0;
  const variance =
    expenseValues.length > 1
      ? expenseValues.reduce((s, v) => s + Math.pow(v - avgExpense, 2), 0) / (expenseValues.length - 1)
      : 0;
  const stdDev = Math.sqrt(variance);
  const anomalyThreshold = stdDev > 0 ? avgExpense + stdDev * 2 : avgExpense * 1.8;
  const anomalies = yearExpenseOnly
    .filter((e) => e.amount >= anomalyThreshold && e.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Subscription-like merchant detection (recurring pattern candidates)
  const merchantGroups = yearExpenseOnly.reduce<Record<string, Date[]>>((acc, expense) => {
    const merchant = (expense.merchant || expense.note || "").trim().toLowerCase();
    if (!merchant || merchant.length < 3) return acc;
    if (!acc[merchant]) acc[merchant] = [];
    acc[merchant].push(new Date(expense.date));
    return acc;
  }, {});
  const subscriptionCandidates = Object.entries(merchantGroups)
    .map(([merchant, dates]) => {
      const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
      if (sorted.length < 3) return null;
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i += 1) {
        const diffMs = sorted[i].getTime() - sorted[i - 1].getTime();
        gaps.push(diffMs / (1000 * 60 * 60 * 24));
      }
      const avgGap = gaps.reduce((s, v) => s + v, 0) / gaps.length;
      const stable = gaps.every((g) => Math.abs(g - avgGap) <= 10);
      if (avgGap >= 20 && avgGap <= 40 && stable) {
        return { merchant, occurrences: sorted.length, averageGapDays: avgGap };
      }
      return null;
    })
    .filter((v): v is { merchant: string; occurrences: number; averageGapDays: number } => Boolean(v))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 4);

  const recommendations: string[] = [];
  if (savingsRate < 10) recommendations.push("Savings rate is low. Try reducing variable categories by 10-15%.");
  if (topCategoryShare > 45 && topCategory) {
    recommendations.push(`${topCategory.name} is ${topCategoryShare.toFixed(0)}% of spend. Consider setting a category cap.`);
  }
  if (anomalies.length > 0) recommendations.push("Review high-value anomaly transactions for one-off or duplicate charges.");
  if (recommendations.length === 0) recommendations.push("Great balance across categories. Keep your current spending strategy.");

  return (
    <div className="space-y-8 md:space-y-10 animate-in p-2 sm:p-4 md:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">Financial Insights</h1>
          <p className="text-muted-foreground mt-1 font-medium">Deep dive into your spending patterns for {year}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex bg-card border border-border rounded-2xl p-1 shadow-sm w-full sm:w-auto">
            <button
              onClick={() => exportToCSV(yearExpenses)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 hover:bg-accent rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              onClick={() => exportToPDF(yearExpenses)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 hover:bg-accent rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-4 sm:px-6 py-3 rounded-2xl bg-card border border-border font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-sm focus:ring-2 focus:ring-primary outline-none transition-all w-full sm:w-auto"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 rounded-[2rem] sm:rounded-[2.5rem] bg-card border border-border p-4 sm:p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="h-48 w-48 text-primary" />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-6 sm:mb-10">
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                Total Yearly Spending
              </p>
              <h3 className="text-3xl sm:text-4xl font-black text-foreground">{formatAmount(yearTotal)}</h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                Avg Monthly
              </p>
              <p className="text-lg sm:text-xl font-black text-foreground">{formatAmount(yearTotal / (summaries.length || 1))}</p>
            </div>
          </div>

          <div className="h-[260px] sm:h-80 relative z-10">
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
                  align={isMobile ? "center" : "right"}
                  iconType="circle"
                  wrapperStyle={{
                    paddingBottom: isMobile ? 8 : 20,
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    fontSize: 10,
                  }}
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

        <div className="rounded-[2rem] sm:rounded-[2.5rem] bg-card border border-border p-4 sm:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden">
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Savings Rate</p>
          <p className="text-3xl font-black text-foreground mt-2">{savingsRate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            Income {formatAmount(yearIncome)} vs spending {formatAmount(yearTotal)}
          </p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No-Spend Streak</p>
          <p className="text-3xl font-black text-foreground mt-2">{currentNoSpendStreak} days</p>
          <p className="text-xs text-muted-foreground mt-1">Best streak: {longestNoSpendStreak} days</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Top Spend Day</p>
          <p className="text-lg font-black text-foreground mt-2">
            {topSpendDay ? format(new Date(topSpendDay[0]), "dd MMM yyyy") : "N/A"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {topSpendDay ? formatAmount(topSpendDay[1]) : "No data"}
          </p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Concentration Risk</p>
          <p className="text-3xl font-black text-foreground mt-2">{topCategoryShare.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-1">Top category share of total spend</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="rounded-[2rem] bg-card border border-border p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg font-black text-foreground mb-4">Anomaly Watch</h3>
          {anomalies.length > 0 ? (
            <div className="space-y-3">
              {anomalies.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-accent/20 border border-border"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">
                      {expense.note || expense.merchant || "Expense"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{format(new Date(expense.date), "dd MMM yyyy")}</p>
                  </div>
                  <p className="font-black text-foreground">{formatAmount(expense.amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No anomalies detected for this year.</p>
          )}
        </div>

        <div className="rounded-[2rem] bg-card border border-border p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg font-black text-foreground mb-4">Recurring Subscription Candidates</h3>
          {subscriptionCandidates.length > 0 ? (
            <div className="space-y-3">
              {subscriptionCandidates.map((candidate) => (
                <div
                  key={candidate.merchant}
                  className="p-3 rounded-xl bg-accent/20 border border-border"
                >
                  <p className="font-bold text-sm text-foreground capitalize">{candidate.merchant}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {candidate.occurrences} occurrences, avg every {candidate.averageGapDays.toFixed(0)} days
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No strong recurring merchant pattern found.</p>
          )}
        </div>
      </div>

      <div className="rounded-[2rem] bg-card border border-border p-4 sm:p-6 shadow-sm">
        <h3 className="text-lg font-black text-foreground mb-4">AI-like Recommendations</h3>
        <div className="space-y-2">
          {recommendations.map((item, idx) => (
            <p
              key={idx}
              className="text-sm text-foreground bg-accent/20 border border-border rounded-xl px-3 py-2"
            >
              {item}
            </p>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="rounded-[2rem] sm:rounded-[2.5rem] bg-card border border-border p-4 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <PieChartIcon className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Yearly Distribution</h3>
          </div>
          <div className="h-[260px] sm:h-80">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={categoryTotals}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 45 : 70}
                  outerRadius={isMobile ? 70 : 100}
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
                {!isMobile && (
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    wrapperStyle={{ fontWeight: "bold", fontSize: 10, textTransform: "uppercase" }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[2rem] sm:rounded-[2.5rem] bg-card border border-border p-4 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Category Breakdown</h3>
          </div>
          <div className="space-y-6 max-h-[320px] overflow-y-auto pr-1 sm:pr-4 no-scrollbar">
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

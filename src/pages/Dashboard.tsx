import { useState } from "react";
import { Link } from "react-router-dom";
import { format, startOfMonth, subMonths, subDays, eachDayOfInterval, isSameDay } from "date-fns";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { useExpenses } from "../context/ExpenseContext";
import { useBudget } from "../context/BudgetContext";
import { useCategories } from "../context/CategoryContext";
import { useCards } from "../context/CardContext";
import { useSavings } from "../context/SavingsContext";
import { useCurrency } from "../hooks/useCurrency";
import { cn } from "../utils/cn";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  Zap,
  Target,
  AlertCircle,
  Repeat,
  DollarSign,
} from "lucide-react";
import type { Expense, SavingsGoal } from "../types";
import { useModal } from "../context/ModalContext";

export default function Dashboard() {
  const [monthOffset, setMonthOffset] = useState(0);
  const { showTransactionModal } = useModal();

  const { getExpensesByMonth, totalSpent, totalIncome, getBalances, expenses: allExpenses } = useExpenses();
  const { categories } = useCategories();
  const { monthlyBudget } = useBudget();
  const { cards } = useCards();
  const { savingsGoals } = useSavings();
  const { formatAmount } = useCurrency();

  const base = startOfMonth(subMonths(new Date(), monthOffset));
  const year = base.getFullYear();
  const month = base.getMonth() + 1;
  const currentMonthExpenses = getExpensesByMonth(year, month);
  const totalExpenses = totalSpent(year, month);
  const totalInc = totalIncome(year, month);
  const netBalance = totalInc - totalExpenses;
  const { cash, cards: cardBalances } = getBalances();

  const pieData = categories
    .map((c) => ({
      name: c.name,
      value: currentMonthExpenses
        .filter((e) => e.categoryId === c.id && e.type === "expense")
        .reduce((s, e) => s + e.amount, 0),
      color: c.color,
    }))
    .filter((d) => d.value > 0);

  const recentExpenses = [...allExpenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const budgetProgress = Math.min((totalExpenses / (monthlyBudget || 1)) * 100, 100);

  // Weekly Trend Data (Income vs Expense)
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date(),
  });

  const weeklyTrendData = last7Days.map((day) => {
    const dayExpenses = allExpenses
      .filter((e) => isSameDay(new Date(e.date), day) && e.type === "expense")
      .reduce((sum, e) => sum + e.amount, 0);
    const dayIncome = allExpenses
      .filter((e) => isSameDay(new Date(e.date), day) && e.type === "income")
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      day: format(day, "EEE"),
      expenses: dayExpenses,
      income: dayIncome,
    };
  });

  return (
    <div className="space-y-10 animate-in p-4 md:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 font-medium">Your financial health at a glance.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-card border border-border rounded-2xl p-1.5 shadow-sm">
            <button
              onClick={() => setMonthOffset((o) => o + 1)}
              className="p-2.5 hover:bg-accent rounded-xl transition-all"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <span className="px-6 font-bold text-sm min-w-[140px] text-center text-foreground uppercase tracking-widest">
              {format(base, "MMMM yyyy")}
            </span>
            <button
              onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
              disabled={monthOffset === 0}
              className="p-2.5 hover:bg-accent rounded-xl transition-all disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
          </div>

          <button
            onClick={() => showTransactionModal()}
            className="bg-primary text-primary-foreground p-3 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-3xl p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="h-24 w-24 text-success" />
          </div>
          <p className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-1">Total Income</p>
          <p className="text-4xl font-black text-foreground">{formatAmount(totalInc)}</p>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-success bg-success/10 w-fit px-3 py-1 rounded-full border border-success/10">
            <TrendingUp className="h-3 w-3" />
            <span>Positive Cashflow</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingDown className="h-24 w-24 text-danger" />
          </div>
          <p className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-1">Total Spent</p>
          <p className="text-4xl font-black text-foreground">{formatAmount(totalExpenses)}</p>
          <div className="mt-4 h-2 bg-accent/10 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                budgetProgress > 90 ? "bg-danger" : budgetProgress > 70 ? "bg-warning" : "bg-success",
              )}
              style={{ width: `${budgetProgress}%` }}
            />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-tighter">
            {budgetProgress.toFixed(1)}% of budget used
          </p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="h-24 w-24 text-primary" />
          </div>
          <p className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-1">Net Balance</p>
          <p className={cn("text-4xl font-black", netBalance >= 0 ? "text-success" : "text-danger")}>
            {formatAmount(netBalance)}
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 w-fit px-3 py-1 rounded-full border border-primary/10">
            <Zap className="h-3 w-3" />
            <span>Monthly Outlook</span>
          </div>
        </div>
      </div>

      {/* Advanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weekly Trend Bar Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight text-foreground">Cashflow Trend</h2>
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-accent/30 px-3 py-1 rounded-full border border-border">
              <TrendingUp className="h-3 w-3 text-success" />
              <span>Last 7 Days</span>
            </div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm h-[350px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart data={weeklyTrendData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="day"
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
                    borderRadius: "12px",
                    fontWeight: "bold",
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "10px" }}
                />
                <Bar
                  name="Income"
                  dataKey="income"
                  fill="var(--success)"
                  radius={[6, 6, 0, 0]}
                  barSize={30}
                />
                <Bar
                  name="Expenses"
                  dataKey="expenses"
                  fill="var(--danger)"
                  radius={[6, 6, 0, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Chart */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black tracking-tight text-foreground">Spending Split</h2>
          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm h-[350px] flex flex-col items-center justify-center">
            {pieData.length > 0 ? (
              <div className="w-full h-full">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
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
                        borderRadius: "12px",
                        fontWeight: "bold",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground font-bold">No data for this month.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight text-foreground">Recent Activity</h2>
            <Link
              to="/history"
              className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentExpenses.length > 0 ? (
              recentExpenses.map((expense: Expense) => (
                <div
                  key={expense.id}
                  onClick={() => showTransactionModal(expense)}
                  className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between hover:bg-accent/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform",
                        expense.type === "income" ? "bg-success/20 text-success" : "bg-accent text-foreground",
                      )}
                    >
                      {categories.find((c) => c.id === expense.categoryId)?.icon || "💰"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground">{expense.note || expense.merchant || "Transaction"}</p>
                        {expense.recurring?.isRecurring && <Repeat className="h-3 w-3 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">
                        {format(new Date(expense.date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-black", expense.type === "income" ? "text-success" : "text-foreground")}>
                      {expense.type === "income" ? "+" : "-"}
                      {formatAmount(expense.amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">
                      {expense.paymentMethodType}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-card border border-border border-dashed rounded-3xl p-12 text-center">
                <p className="text-muted-foreground font-bold">No transactions yet.</p>
                <button
                  onClick={() => showTransactionModal()}
                  className="text-primary font-black mt-2 inline-block"
                >
                  Start tracking now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Savings Goals */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight text-foreground">Savings Goals</h2>
            <Link
              to="/savings"
              className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
            >
              Manage <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm flex flex-col justify-center min-h-[300px] relative overflow-hidden">
            {savingsGoals.length > 0 ? (
              <div className="space-y-6 w-full">
                {savingsGoals.slice(0, 3).map((goal: SavingsGoal) => {
                  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                  return (
                    <div
                      key={goal.id}
                      className="space-y-3"
                    >
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm"
                            style={{ backgroundColor: goal.color + "20" }}
                          >
                            {goal.icon || "🎯"}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground">{goal.name}</p>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                              {formatAmount(goal.currentAmount)} of {formatAmount(goal.targetAmount)}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-primary bg-primary/10 px-2 py-1 rounded-lg">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-accent/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-1000"
                          style={{ width: `${progress}%`, backgroundColor: goal.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Target className="h-48 w-48 text-primary" />
                </div>
                <div className="text-center relative z-10">
                  <Target className="h-12 w-12 text-primary mx-auto mb-4 opacity-40" />
                  <h3 className="text-lg font-black text-foreground mb-2">Set Your Financial Goals</h3>
                  <p className="text-sm text-muted-foreground max-w-[280px] mx-auto mb-6">
                    Track your progress towards a new car, a dream vacation, or your emergency fund.
                  </p>
                  <Link
                    to="/savings"
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all inline-block"
                  >
                    Create First Goal
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Wallets */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight text-foreground">My Wallets</h2>
          <Link
            to="/cards"
            className="text-sm font-bold text-primary hover:underline"
          >
            Manage Cards
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-linear-to-br from-emerald-500 to-emerald-600 p-6 rounded-3xl text-white shadow-xl flex flex-col justify-between min-h-[160px] group hover:scale-[1.02] transition-transform">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-white/20 rounded-xl">
                <Wallet className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Cash</span>
            </div>
            <div>
              <p className="text-xs font-bold opacity-80 mb-1">Total Balance</p>
              <p className="text-3xl font-black">{formatAmount(cash)}</p>
            </div>
          </div>

          {cards.map((card) => (
            <div
              key={card.id}
              className="p-6 rounded-3xl text-white shadow-xl flex flex-col justify-between min-h-[160px] group hover:scale-[1.02] transition-transform relative overflow-hidden"
              style={{ backgroundColor: card.color || "#6366f1" }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <CreditCard className="h-24 w-24" />
              </div>
              <div className="flex justify-between items-start relative z-10">
                <div className="p-2 bg-white/20 rounded-xl">
                  <CreditCard className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{card.bankName}</span>
              </div>
              <div className="relative z-10">
                <p className="text-xs font-bold opacity-80 mb-1">Balance</p>
                <p className="text-3xl font-black">{formatAmount(cardBalances[card.id] || 0)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

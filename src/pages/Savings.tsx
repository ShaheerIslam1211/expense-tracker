import { useState } from "react";
import { Plus, PiggyBank } from "lucide-react";
import { format, subMonths } from "date-fns";
import { useSavings } from "../context/SavingsContext";
import { useCurrency } from "../hooks/useCurrency";
import { useExpenses } from "../context/ExpenseContext";
import { SavingsGoalModal } from "../components/SavingsGoalModal";
import { SavingsGoalCard } from "../components/SavingsGoalCard";
import type { SavingsGoal } from "../types";
import { savingsNum } from "../utils/savingsDisplay";

export default function Savings() {
  const { savingsGoals, loading, deleteSavingsGoal } = useSavings();
  const { formatAmount, currency } = useCurrency();
  const { totalIncome } = useExpenses();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [logExpenseOverride, setLogExpenseOverride] = useState<Record<string, boolean>>({});

  const now = new Date();
  const thisMonth = format(now, "yyyy-MM");
  const prevMonth = subMonths(now, 1);
  const lastMonthIncome = totalIncome(prevMonth.getFullYear(), prevMonth.getMonth() + 1);
  const thisMonthIncome = totalIncome(now.getFullYear(), now.getMonth() + 1);

  const logExpenseForDeposit = (goalId: string, goal: SavingsGoal) => {
    if (logExpenseOverride[goalId] !== undefined) return logExpenseOverride[goalId];
    return goal.logDepositAsExpense !== false;
  };

  const totalSaved = savingsGoals.reduce((s, g) => s + savingsNum(g.currentAmount), 0);

  const depositedThisMonth = savingsGoals.reduce((sum, g) => {
    const deps = g.recentDeposits ?? [];
    const monthDeps = deps.filter((d) => d.at.startsWith(thisMonth));
    return sum + monthDeps.reduce((a, d) => a + savingsNum(d.amount), 0);
  }, 0);

  const sortedGoals = [...savingsGoals].sort((a, b) => {
    const pa = a.priority ?? 999;
    const pb = b.priority ?? 999;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });

  const handleEditGoal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleAddNewGoal = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  const handleDeleteGoal = (goal: SavingsGoal) => {
    if (!confirm(`Delete “${goal.name}”? Saved progress will be lost.`)) return;
    void deleteSavingsGoal(goal.id);
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-8 sm:space-y-10 animate-in">
        <header className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3 max-w-2xl">
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-primary">Financial goals</p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-tight">
              Savings
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed">
              Goals, deposits, and history in one place. Backfill past months with a dated deposit, edit mistakes, or
              remove a row — balances and optional budget lines stay aligned.
              {currency === "PKR" ? " Amounts follow your profile (PKR)." : ""}
            </p>
            {!loading && savingsGoals.length > 0 ? (
              <p className="text-[11px] text-muted-foreground font-medium">
                {savingsGoals.length} goal{savingsGoals.length === 1 ? "" : "s"} ·{" "}
                <span className="text-foreground font-semibold tabular-nums">{formatAmount(totalSaved)}</span> saved
                <span className="text-border mx-1.5">·</span>
                <span className="tabular-nums">
                  <span className="text-foreground font-semibold">{formatAmount(depositedThisMonth)}</span> deposited
                  this month
                </span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleAddNewGoal}
            className="shrink-0 inline-flex items-center justify-center gap-2 sm:gap-3 bg-primary text-primary-foreground px-5 sm:px-7 py-3.5 sm:py-4 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all w-full sm:w-auto"
          >
            <Plus className="h-5 w-5 shrink-0" />
            New goal
          </button>
        </header>

        <details className="group rounded-2xl border border-border/80 bg-card/40 px-4 py-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer list-none font-black uppercase tracking-wider text-[10px] text-foreground flex items-center justify-between gap-2">
            <span>Income & budget</span>
            <span className="text-muted-foreground font-semibold normal-case tracking-normal group-open:hidden">
              Show
            </span>
            <span className="text-muted-foreground font-semibold normal-case tracking-normal hidden group-open:inline">
              Hide
            </span>
          </summary>
          <p className="mt-3 leading-relaxed border-t border-border/60 pt-3">
            Set <strong className="text-foreground">monthly income</strong> on each goal (or pull from logged salary in
            the editor). Use <strong className="text-foreground">Log as expense</strong> so deposits count like other
            spending against that income. Past-dated deposits backfill history; edit or remove any row and linked budget
            lines stay in sync.
          </p>
        </details>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-3xl border border-border bg-card h-80 sm:h-96 animate-pulse"
              />
            ))}
          </div>
        ) : savingsGoals.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/40 px-6 py-16 sm:py-24 text-center">
            <PiggyBank
              className="h-14 w-14 sm:h-16 sm:w-16 mx-auto text-muted-foreground opacity-50"
              strokeWidth={1.25}
            />
            <h2 className="mt-4 text-xl sm:text-2xl font-black text-foreground">No goals yet</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Create a goal, set monthly savings from income, then add deposits — including last month — with full edit
              and delete on each entry.
            </p>
            <button
              type="button"
              onClick={handleAddNewGoal}
              className="mt-8 inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest"
            >
              <Plus className="h-4 w-4" />
              Create first goal
            </button>
          </div>
        ) : (
          <section>
            <h2 className="text-lg sm:text-xl font-black text-foreground mb-4 sm:mb-6">Your goals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6 xl:gap-8">
              {sortedGoals.map((goal) => (
                <SavingsGoalCard
                  key={goal.id}
                  goal={goal}
                  formatAmount={formatAmount}
                  thisMonthYm={thisMonth}
                  logExpenseChecked={logExpenseForDeposit(goal.id, goal)}
                  onLogExpenseChange={(checked) => setLogExpenseOverride((prev) => ({ ...prev, [goal.id]: checked }))}
                  onEdit={() => handleEditGoal(goal)}
                  onDelete={() => handleDeleteGoal(goal)}
                />
              ))}
            </div>
          </section>
        )}

        <SavingsGoalModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingGoal={editingGoal}
          lastMonthLoggedIncome={lastMonthIncome}
          lastMonthLabel={format(prevMonth, "MMMM yyyy")}
          thisMonthLoggedIncome={thisMonthIncome}
          thisMonthLabel={format(now, "MMMM yyyy")}
        />
      </div>
    </div>
  );
}

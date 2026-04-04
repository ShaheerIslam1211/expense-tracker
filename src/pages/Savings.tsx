import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Target, Info, TrendingUp, CalendarDays, Layers } from "lucide-react";
import { format } from "date-fns";
import { useSavings } from "../context/SavingsContext";
import { useCurrency } from "../hooks/useCurrency";
import { useToast } from "../context/ToastContext";
import { SavingsGoalModal } from "../components/SavingsGoalModal";
import { SavingsGoalCard } from "../components/SavingsGoalCard";
import type { SavingsGoal } from "../types";
import { savingsNum } from "../utils/savingsDisplay";

export default function Savings() {
  const { savingsGoals, loading, deleteSavingsGoal, recordSavingsContribution } = useSavings();
  const { formatAmount, currency } = useCurrency();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [depositExpandId, setDepositExpandId] = useState<string | null>(null);
  const [customDeposit, setCustomDeposit] = useState("");
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [logExpenseOverride, setLogExpenseOverride] = useState<Record<string, boolean>>({});

  const thisMonth = format(new Date(), "yyyy-MM");

  const logExpenseForDeposit = (goalId: string, goal: SavingsGoal) => {
    if (logExpenseOverride[goalId] !== undefined) return logExpenseOverride[goalId];
    return goal.logDepositAsExpense !== false;
  };

  const totalSaved = useMemo(
    () => savingsGoals.reduce((s, g) => s + savingsNum(g.currentAmount), 0),
    [savingsGoals],
  );

  const depositedThisMonth = useMemo(() => {
    return savingsGoals.reduce((sum, g) => {
      const monthDeps = (g.recentDeposits ?? []).filter((d) => d.at.startsWith(thisMonth));
      return sum + monthDeps.reduce((a, d) => a + savingsNum(d.amount), 0);
    }, 0);
  }, [savingsGoals, thisMonth]);

  const combinedTarget = useMemo(
    () => savingsGoals.reduce((s, g) => s + savingsNum(g.targetAmount), 0),
    [savingsGoals],
  );

  const overallProgressPct =
    combinedTarget > 0 ? Math.round(Math.min((totalSaved / combinedTarget) * 100, 100)) : 0;

  const handleRecordPlanned = async (goal: SavingsGoal) => {
    if (!goal.monthlyContribution || goal.monthlyContribution <= 0) {
      showToast("Set a monthly saving amount in Edit goal first.", "error");
      return;
    }
    setRecordingId(goal.id);
    try {
      await recordSavingsContribution(goal.id, undefined, {
        logAsExpense: logExpenseForDeposit(goal.id, goal),
      });
      showToast(`Added ${formatAmount(goal.monthlyContribution)} to ${goal.name}`, "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not record deposit";
      showToast(msg, e instanceof Error && msg.includes("goal balance was updated") ? "info" : "error");
    } finally {
      setRecordingId(null);
    }
  };

  const handleRecordCustom = async (goal: SavingsGoal) => {
    const n = Math.floor(Number(customDeposit));
    if (!Number.isFinite(n) || n <= 0) {
      showToast("Enter a valid amount greater than zero.", "error");
      return;
    }
    setRecordingId(goal.id);
    try {
      await recordSavingsContribution(goal.id, n, {
        logAsExpense: logExpenseForDeposit(goal.id, goal),
      });
      showToast(`Added ${formatAmount(n)} to ${goal.name}`, "success");
      setCustomDeposit("");
      setDepositExpandId(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not record deposit";
      showToast(msg, e instanceof Error && msg.includes("goal balance was updated") ? "info" : "error");
    } finally {
      setRecordingId(null);
    }
  };

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
          <div className="space-y-2 max-w-2xl">
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-primary">
              Financial goals
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-tight">
              Savings & targets
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed">
              Stack deposits month after month, optionally mirror them as expenses so your budget matches money you move
              from salary into savings.
              {currency === "PKR" ? " Amounts follow your profile (PKR)." : ""}
            </p>
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

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl sm:rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-6 flex gap-3 sm:gap-4"
        >
          <Info className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-primary mt-0.5" aria-hidden />
          <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
            <p className="font-bold text-foreground">How your saved total grows</p>
            <p>
              Each time you record a deposit, that amount is <strong className="text-foreground">added</strong> to the
              goal. Example: 20,000 one month + 20,000 the next = <strong className="text-foreground">40,000</strong>{" "}
              saved — nothing gets replaced.
            </p>
            <p>
              Use <strong className="text-foreground">Log as expense</strong> when you want that same amount to appear
              as spending for the month (money leaving your salary / disposable income). You will see it in History under
              “Savings / Goal deposit”.
            </p>
          </div>
        </motion.div>

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
            <Target className="h-14 w-14 sm:h-16 sm:w-16 mx-auto text-muted-foreground opacity-40" />
            <h2 className="mt-4 text-xl sm:text-2xl font-black text-foreground">No goals yet</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Create a goal, set how much you save from salary each month, then tap deposit when you move money.
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
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-wider">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Total saved
                </div>
                <p className="text-2xl sm:text-3xl font-black tabular-nums text-foreground tracking-tight">
                  {formatAmount(totalSaved)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {overallProgressPct}% of combined targets
                  {combinedTarget > 0 ? ` (${formatAmount(combinedTarget)})` : ""}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-wider">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  This month
                </div>
                <p className="text-2xl sm:text-3xl font-black tabular-nums text-foreground tracking-tight">
                  {formatAmount(depositedThisMonth)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Logged on goals {depositedThisMonth > 0 ? "(from deposit history)" : "— add a deposit to see"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-wider">
                  <Layers className="h-4 w-4 text-primary" />
                  Active goals
                </div>
                <p className="text-2xl sm:text-3xl font-black tabular-nums text-foreground tracking-tight">
                  {savingsGoals.length}
                </p>
                <p className="text-[11px] text-muted-foreground">Short & long term combined</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-wider">
                  <Target className="h-4 w-4 text-primary" />
                  Overall progress
                </div>
                <div className="h-2.5 bg-accent/25 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${overallProgressPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  All goals: saved vs sum of targets
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-black text-foreground mb-4 sm:mb-6">Your goals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6 xl:gap-8">
                {savingsGoals.map((goal) => (
                  <SavingsGoalCard
                    key={goal.id}
                    goal={goal}
                    formatAmount={formatAmount}
                    thisMonthYm={thisMonth}
                    recordingId={recordingId}
                    depositExpandId={depositExpandId}
                    customDeposit={customDeposit}
                    logExpenseChecked={logExpenseForDeposit(goal.id, goal)}
                    onLogExpenseChange={(checked) =>
                      setLogExpenseOverride((prev) => ({ ...prev, [goal.id]: checked }))
                    }
                    onRecordPlanned={() => handleRecordPlanned(goal)}
                    onToggleDepositExpand={() => {
                      setDepositExpandId((id) => (id === goal.id ? null : goal.id));
                      setCustomDeposit("");
                    }}
                    onCustomDepositChange={setCustomDeposit}
                    onRecordCustom={() => handleRecordCustom(goal)}
                    onEdit={() => handleEditGoal(goal)}
                    onDelete={() => handleDeleteGoal(goal)}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        <SavingsGoalModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingGoal={editingGoal}
        />
      </div>
    </div>
  );
}

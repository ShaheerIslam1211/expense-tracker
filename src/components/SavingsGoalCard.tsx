import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Edit, MoreVertical, PiggyBank, Trash, Wallet, Receipt } from "lucide-react";
import type { SavingsGoal } from "../types";
import { cn } from "../utils/cn";
import { savingsNum } from "../utils/savingsDisplay";

export interface SavingsGoalCardProps {
  goal: SavingsGoal;
  formatAmount: (n: number, opts?: { compact?: boolean; symbol?: boolean }) => string;
  thisMonthYm: string;
  recordingId: string | null;
  depositExpandId: string | null;
  customDeposit: string;
  logExpenseChecked: boolean;
  onLogExpenseChange: (checked: boolean) => void;
  onRecordPlanned: () => void;
  onToggleDepositExpand: () => void;
  onCustomDepositChange: (v: string) => void;
  onRecordCustom: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SavingsGoalCard({
  goal,
  formatAmount,
  thisMonthYm,
  recordingId,
  depositExpandId,
  customDeposit,
  logExpenseChecked,
  onLogExpenseChange,
  onRecordPlanned,
  onToggleDepositExpand,
  onCustomDepositChange,
  onRecordCustom,
  onEdit,
  onDelete,
}: SavingsGoalCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const down = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [menuOpen]);

  const saved = savingsNum(goal.currentAmount);
  const target = savingsNum(goal.targetAmount);
  const pct = target > 0 ? Math.round(Math.min((saved / target) * 100, 100)) : 0;
  const recent = [...(goal.recentDeposits ?? [])].reverse().slice(0, 5);
  const thisMonthTotal = (goal.recentDeposits ?? [])
    .filter((d) => d.at.startsWith(thisMonthYm))
    .reduce((s, d) => s + savingsNum(d.amount), 0);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative flex flex-col rounded-3xl border border-border/80 bg-card shadow-sm overflow-hidden",
        "min-h-0",
      )}
    >
      <div
        className="h-1.5 w-full shrink-0"
        style={{ backgroundColor: goal.color || "var(--color-primary)" }}
      />
      <div className="p-5 sm:p-6 flex flex-col flex-1 gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl shadow-inner"
              style={{ backgroundColor: `${goal.color || "#6366f1"}22` }}
            >
              {goal.icon || "🎯"}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-black tracking-tight text-foreground truncate">{goal.name}</h3>
              {goal.description ? (
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-0.5">{goal.description}</p>
              ) : null}
            </div>
          </div>
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              aria-label="Goal actions"
              onClick={() => setMenuOpen((o) => !o)}
              className="p-2.5 rounded-xl hover:bg-accent border border-transparent hover:border-border transition"
            >
              <MoreVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-border bg-card shadow-xl z-20 py-1">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  <Edit className="h-4 w-4" />
                  Edit goal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-danger hover:bg-accent"
                >
                  <Trash className="h-4 w-4" />
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/15 text-primary">
            {goal.type.replace(/-/g, " ")}
          </span>
          {goal.dueDate ? (
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-accent text-muted-foreground">
              Due {format(parseISO(goal.dueDate), "MMM d, yyyy")}
            </span>
          ) : null}
          {goal.lastContributionMonth === thisMonthYm ? (
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-success/15 text-success">
              Logged {format(new Date(`${thisMonthYm}-01`), "MMM yyyy")}
            </span>
          ) : null}
        </div>

        <div className="rounded-2xl bg-background/80 border border-border/60 p-4 sm:p-5 space-y-1">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Saved total</span>
            <span className="text-2xl sm:text-3xl font-black tabular-nums text-foreground tracking-tight">
              {formatAmount(saved)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Each deposit <span className="text-foreground font-semibold">adds</span> here (e.g. 20k + 20k → 40k). It does
            not replace past savings.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50 mt-3">
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            <span>
              Target <span className="font-bold text-foreground">{formatAmount(target)}</span>
            </span>
            {goal.monthlyContribution != null && goal.monthlyContribution > 0 ? (
              <>
                <span className="text-border">·</span>
                <span>
                  Plan{" "}
                  <span className="font-bold text-primary">{formatAmount(goal.monthlyContribution)}/mo</span>
                  {goal.monthlyIncome != null && goal.monthlyIncome > 0 ? (
                    <span className="text-muted-foreground font-medium">
                      {" "}
                      ({((goal.monthlyContribution / goal.monthlyIncome) * 100).toFixed(1)}% of income)
                    </span>
                  ) : null}
                </span>
              </>
            ) : null}
          </div>
          {thisMonthTotal > 0 ? (
            <p className="text-[11px] font-semibold text-success mt-2 flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" />
              {formatAmount(thisMonthTotal)} logged to this goal this month
            </p>
          ) : null}
        </div>

        <div>
          <div className="h-2.5 sm:h-3 bg-accent/25 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 22 }}
              className="h-full rounded-full"
              style={{ backgroundColor: goal.color || "#10b981" }}
            />
          </div>
          <div className="flex justify-between items-center mt-1.5 text-xs font-black text-foreground tabular-nums">
            <span className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider">Progress</span>
            <span>{pct}%</span>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-border/70 bg-accent/10 px-3 py-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={logExpenseChecked}
            onChange={(e) => onLogExpenseChange(e.target.checked)}
            className="mt-0.5 rounded border-border"
          />
          <span className="text-xs leading-snug">
            <span className="font-bold text-foreground">Log as expense</span>
            <span className="block text-muted-foreground font-medium mt-0.5">
              Count this deposit in monthly spending (salary / budget). Uses category “Savings / Goal deposit”.
            </span>
          </span>
        </label>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-auto pt-1">
          {goal.monthlyContribution != null && goal.monthlyContribution > 0 ? (
            <button
              type="button"
              disabled={recordingId === goal.id}
              onClick={onRecordPlanned}
              className="inline-flex flex-1 min-h-11 items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wide shadow-lg shadow-primary/15 hover:opacity-95 transition disabled:opacity-45"
            >
              <PiggyBank className="h-4 w-4 shrink-0" />
              Add {formatAmount(goal.monthlyContribution)}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleDepositExpand}
            className={cn(
              "inline-flex min-h-11 items-center justify-center px-4 py-2.5 rounded-xl border border-border text-xs font-black uppercase tracking-wide hover:bg-accent transition",
              goal.monthlyContribution && goal.monthlyContribution > 0 ? "sm:flex-initial flex-1" : "flex-1",
            )}
          >
            {depositExpandId === goal.id ? "Close" : "Custom amount"}
          </button>
        </div>

        {depositExpandId === goal.id ? (
          <div className="rounded-xl border border-dashed border-border bg-background/50 p-3 sm:p-4 space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Amount to add
              <input
                type="number"
                min={1}
                step={1}
                value={customDeposit}
                onChange={(e) => onCustomDepositChange(e.target.value)}
                placeholder="e.g. 20000"
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm font-bold tabular-nums"
              />
            </label>
            <button
              type="button"
              disabled={recordingId === goal.id}
              onClick={onRecordCustom}
              className="w-full min-h-11 rounded-xl bg-success text-white text-xs font-black uppercase tracking-wide hover:opacity-95 transition disabled:opacity-45"
            >
              Add to saved total
            </button>
          </div>
        ) : null}

        <div className="border-t border-border/60 pt-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Recent deposits</p>
          {recent.length ? (
            <ul className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
              {recent.map((d, i) => (
                <li
                  key={`${d.at}-${i}`}
                  className="flex justify-between gap-2 text-[11px] sm:text-xs text-muted-foreground"
                >
                  <span className="truncate">{format(parseISO(d.at), "MMM d, yyyy · HH:mm")}</span>
                  <span className="font-bold text-foreground tabular-nums shrink-0">+{formatAmount(savingsNum(d.amount))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-muted-foreground">No history yet — your next deposit will show here.</p>
          )}
        </div>
      </div>
    </motion.article>
  );
}

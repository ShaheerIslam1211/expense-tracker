import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Edit, MoreVertical, PiggyBank, Trash, Wallet, Receipt, Pencil, CalendarClock } from "lucide-react";
import type { SavingsDepositSource, SavingsGoal } from "../types";
import { cn } from "../utils/cn";
import { savingsNum } from "../utils/savingsDisplay";
import { parseSavingsDeposits } from "../utils/savingsDeposits";
import { SavingsGoalIcon } from "./SavingsGoalIcon";
import { useSavings } from "../context/SavingsContext";
import { useToast } from "../context/ToastContext";

const SOURCE_OPTIONS: { value: SavingsDepositSource; label: string }[] = [
  { value: "salary", label: "Salary" },
  { value: "bonus", label: "Bonus" },
  { value: "windfall", label: "Windfall" },
  { value: "other", label: "Other" },
];

function sourceLabel(s?: SavingsDepositSource) {
  return SOURCE_OPTIONS.find((o) => o.value === s)?.label ?? "";
}

export interface SavingsGoalCardProps {
  goal: SavingsGoal;
  formatAmount: (n: number, opts?: { compact?: boolean; symbol?: boolean }) => string;
  thisMonthYm: string;
  logExpenseChecked: boolean;
  onLogExpenseChange: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SavingsGoalCard({
  goal,
  formatAmount,
  thisMonthYm,
  logExpenseChecked,
  onLogExpenseChange,
  onEdit,
  onDelete,
}: SavingsGoalCardProps) {
  const { recordSavingsContribution, updateSavingsDeposit, removeSavingsDeposit } = useSavings();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [depositDate, setDepositDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [depositNote, setDepositNote] = useState("");
  const [depositSource, setDepositSource] = useState<SavingsDepositSource>("salary");
  const [editingDepositId, setEditingDepositId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editSource, setEditSource] = useState<SavingsDepositSource | "">("");
  const menuRef = useRef<HTMLDivElement>(null);

  const deposits = useMemo(() => parseSavingsDeposits(goal.recentDeposits), [goal.recentDeposits]);
  const recent = useMemo(() => [...deposits].reverse(), [deposits]);

  useEffect(() => {
    if (!menuOpen) return;
    const down = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [menuOpen]);

  useEffect(() => {
    if (!depositOpen) return;
    setDepositDate(format(new Date(), "yyyy-MM-dd"));
  }, [depositOpen, goal.id]);

  const saved = savingsNum(goal.currentAmount);
  const target = savingsNum(goal.targetAmount);
  const pct = target > 0 ? Math.round(Math.min((saved / target) * 100, 100)) : 0;
  const thisMonthTotal = deposits
    .filter((d) => d.at.startsWith(thisMonthYm))
    .reduce((s, d) => s + savingsNum(d.amount), 0);

  const startEditDeposit = (d: (typeof deposits)[0]) => {
    setEditingDepositId(d.id);
    setEditAmount(String(Math.floor(savingsNum(d.amount))));
    setEditDate(d.at.slice(0, 10));
    setEditNote(d.note ?? "");
    setEditSource(d.source ?? "");
  };

  const cancelEditDeposit = () => {
    setEditingDepositId(null);
    setEditAmount("");
    setEditDate("");
    setEditNote("");
    setEditSource("");
  };

  const handleSaveEditDeposit = async () => {
    if (!editingDepositId) return;
    const n = Math.floor(Number(editAmount));
    if (!Number.isFinite(n) || n <= 0) {
      showToast("Enter a valid amount greater than zero.", "error");
      return;
    }
    const atIso = `${editDate}T12:00:00.000`;
    const d = new Date(atIso);
    if (Number.isNaN(d.getTime())) {
      showToast("Pick a valid date.", "error");
      return;
    }
    setBusy(true);
    try {
      await updateSavingsDeposit(goal.id, editingDepositId, {
        amount: n,
        at: d.toISOString(),
        note: editNote.trim() ? editNote.trim() : null,
        source: editSource === "" ? null : editSource,
      });
      showToast("Deposit updated", "success");
      cancelEditDeposit();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not update deposit";
      showToast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveDeposit = async (depositId: string) => {
    if (!confirm("Remove this deposit? The goal balance and any linked budget line will be adjusted.")) return;
    setBusy(true);
    try {
      await removeSavingsDeposit(goal.id, depositId);
      showToast("Deposit removed", "success");
      if (editingDepositId === depositId) cancelEditDeposit();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not remove deposit";
      showToast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRecordPlanned = async () => {
    if (!goal.monthlyContribution || goal.monthlyContribution <= 0) {
      showToast("Set a monthly saving amount in Edit goal first.", "error");
      return;
    }
    setBusy(true);
    try {
      await recordSavingsContribution(goal.id, undefined, {
        logAsExpense: logExpenseChecked,
        depositedAt: new Date(),
        source: depositSource,
      });
      showToast(`Added ${formatAmount(goal.monthlyContribution)} to ${goal.name}`, "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not record deposit";
      showToast(msg, e instanceof Error && msg.includes("goal balance was updated") ? "info" : "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRecordCustom = async () => {
    const n = Math.floor(Number(customAmount));
    if (!Number.isFinite(n) || n <= 0) {
      showToast("Enter a valid amount greater than zero.", "error");
      return;
    }
    const atIso = `${depositDate}T12:00:00.000`;
    const depositedAt = new Date(atIso);
    if (Number.isNaN(depositedAt.getTime())) {
      showToast("Pick a valid date.", "error");
      return;
    }
    setBusy(true);
    try {
      await recordSavingsContribution(goal.id, n, {
        logAsExpense: logExpenseChecked,
        depositedAt,
        note: depositNote.trim() || undefined,
        source: depositSource,
      });
      showToast(`Added ${formatAmount(n)} to ${goal.name}`, "success");
      setCustomAmount("");
      setDepositNote("");
      setDepositSource("salary");
      setDepositOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not record deposit";
      showToast(msg, e instanceof Error && msg.includes("goal balance was updated") ? "info" : "error");
    } finally {
      setBusy(false);
    }
  };

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
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner"
              style={{ backgroundColor: `${goal.color || "#6366f1"}22` }}
            >
              <SavingsGoalIcon
                iconKey={goal.icon}
                className="h-6 w-6 text-foreground"
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-black tracking-tight text-foreground truncate">{goal.name}</h3>
              {goal.description ? (
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-0.5">{goal.description}</p>
              ) : null}
              {goal.linkedAccount ? (
                <p className="text-[11px] font-semibold text-primary/90 mt-1 truncate">{goal.linkedAccount}</p>
              ) : null}
            </div>
          </div>
          <div
            className="relative shrink-0"
            ref={menuRef}
          >
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
              Activity {format(new Date(`${thisMonthYm}-01`), "MMM yyyy")}
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
            Each deposit <span className="text-foreground font-semibold">adds</span> here. Edit or remove any row below
            if you need to fix history or backfill a past month.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50 mt-3">
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            <span>
              Goal cap <span className="font-bold text-foreground">{formatAmount(target)}</span>
            </span>
            {goal.monthlyContribution != null && goal.monthlyContribution > 0 ? (
              <>
                <span className="text-border">·</span>
                <span>
                  Plan <span className="font-bold text-primary">{formatAmount(goal.monthlyContribution)}/mo</span>
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
              {formatAmount(thisMonthTotal)} toward this goal this calendar month
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
              Count new deposits in monthly spending vs your salary. Linked rows stay in sync when you edit amounts or
              dates.
            </span>
          </span>
        </label>

        <div className="flex flex-col gap-2 mt-auto pt-1">
          {goal.monthlyContribution != null && goal.monthlyContribution > 0 ? (
            <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
              <label className="flex sm:flex-col sm:justify-center gap-2 sm:gap-1 rounded-xl border border-border/70 bg-background/50 px-3 py-2 sm:py-2.5 sm:min-w-34">
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Source
                </span>
                <select
                  value={depositSource}
                  onChange={(e) => setDepositSource(e.target.value as SavingsDepositSource)}
                  className="w-full sm:flex-1 bg-transparent text-xs font-bold border-0 p-0 focus:ring-0 cursor-pointer"
                >
                  {SOURCE_OPTIONS.map((o) => (
                    <option
                      key={o.value}
                      value={o.value}
                    >
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={handleRecordPlanned}
                className="inline-flex flex-1 min-h-11 items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wide shadow-lg shadow-primary/15 hover:opacity-95 transition disabled:opacity-45"
              >
                <PiggyBank className="h-4 w-4 shrink-0" />
                Add {formatAmount(goal.monthlyContribution)}
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setDepositOpen((o) => !o);
              if (depositOpen) {
                setCustomAmount("");
                setDepositNote("");
                setDepositSource("salary");
              }
            }}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-xs font-black uppercase tracking-wide hover:bg-accent transition",
              goal.monthlyContribution && goal.monthlyContribution > 0 ? "sm:flex-initial flex-1" : "flex-1",
            )}
          >
            <CalendarClock className="h-4 w-4 shrink-0" />
            {depositOpen ? "Close" : "Add deposit"}
          </button>
        </div>

        {depositOpen ? (
          <div className="rounded-xl border border-dashed border-border bg-background/50 p-3 sm:p-4 space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Amount
              <input
                type="number"
                min={1}
                step={1}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="e.g. 20000"
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm font-bold tabular-nums"
              />
            </label>
            <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Date (use a past month to backfill)
              <input
                type="date"
                value={depositDate}
                onChange={(e) => setDepositDate(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm font-bold"
              />
            </label>
            <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Source
              <select
                value={depositSource}
                onChange={(e) => setDepositSource(e.target.value as SavingsDepositSource)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm font-bold"
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option
                    key={o.value}
                    value={o.value}
                  >
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Note (optional)
              <input
                type="text"
                value={depositNote}
                onChange={(e) => setDepositNote(e.target.value)}
                placeholder="e.g. March salary transfer"
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={handleRecordCustom}
              className="w-full min-h-11 rounded-xl bg-success text-white text-xs font-black uppercase tracking-wide hover:opacity-95 transition disabled:opacity-45"
            >
              Save deposit
            </button>
          </div>
        ) : null}

        <div className="border-t border-border/60 pt-3">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Deposit history</p>
            {recent.length ? (
              <span className="text-[10px] font-bold text-muted-foreground tabular-nums">{recent.length} entries</span>
            ) : null}
          </div>
          {recent.length ? (
            <ul className="space-y-2 max-h-80 overflow-y-auto pr-1 scroll-py-2">
              {recent.map((d) => (
                <li
                  key={d.id}
                  className="rounded-lg border border-border/60 bg-background/40 px-2.5 py-2 space-y-2"
                >
                  {editingDepositId === d.id ? (
                    <div className="space-y-2">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-border text-sm font-bold tabular-nums"
                      />
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-border text-sm font-bold"
                      />
                      <select
                        value={editSource}
                        onChange={(e) => setEditSource(e.target.value as SavingsDepositSource | "")}
                        className="w-full px-2 py-1.5 rounded-lg border border-border text-sm font-bold"
                      >
                        <option value="">Source (clear)</option>
                        {SOURCE_OPTIONS.map((o) => (
                          <option
                            key={o.value}
                            value={o.value}
                          >
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder="Note"
                        className="w-full px-2 py-1.5 rounded-lg border border-border text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={handleSaveEditDeposit}
                          className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wide disabled:opacity-45"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={cancelEditDeposit}
                          className="flex-1 py-1.5 rounded-lg border border-border text-[10px] font-black uppercase tracking-wide"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs text-muted-foreground">
                          {format(parseISO(d.at), "MMM d, yyyy · HH:mm")}
                          {d.source ? (
                            <span className="text-foreground font-semibold"> · {sourceLabel(d.source)}</span>
                          ) : null}
                        </p>
                        {d.note ? (
                          <p className="text-[11px] text-foreground/90 font-medium truncate mt-0.5">{d.note}</p>
                        ) : null}
                        {d.expenseId ? (
                          <p className="text-[10px] text-muted-foreground mt-0.5">Synced with budget</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-bold text-foreground tabular-nums text-xs">
                          +{formatAmount(savingsNum(d.amount))}
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => startEditDeposit(d)}
                          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition disabled:opacity-45"
                          aria-label="Edit deposit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleRemoveDeposit(d.id)}
                          className="p-1.5 rounded-lg hover:bg-accent text-danger/80 hover:text-danger transition disabled:opacity-45"
                          aria-label="Remove deposit"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-muted-foreground">No history yet — add a deposit to build your log.</p>
          )}
        </div>
      </div>
    </motion.article>
  );
}

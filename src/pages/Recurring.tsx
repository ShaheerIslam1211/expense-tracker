import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Repeat, Pencil, Ban, Plus } from "lucide-react";
import { useExpenses } from "../context/ExpenseContext";
import { useCategories } from "../context/CategoryContext";
import { useCurrency } from "../hooks/useCurrency";
import { useModal } from "../context/ModalContext";
import { useToast } from "../context/ToastContext";
import { normalizeCategoryId } from "../utils/categoryNormalization";
import type { Expense, RecurringFrequency } from "../types";
import { cn } from "../utils/cn";

const FREQUENCY_LABEL: Record<RecurringFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

function RecurringRow({
  expense,
  categoryLabel,
  formatAmount,
  onEdit,
  onStop,
}: {
  expense: Expense;
  categoryLabel: string;
  formatAmount: (n: number) => string;
  onEdit: () => void;
  onStop: () => void;
}) {
  const rec = expense.recurring!;
  const isIncome = expense.type === "income";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:px-6 border-b border-border last:border-b-0">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg",
            isIncome ? "bg-primary/15" : "bg-accent",
          )}
        >
          {isIncome ? "💰" : "🔁"}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm text-foreground truncate">
              {expense.note || expense.merchant || categoryLabel}
            </p>
            <Repeat className="h-3.5 w-3.5 text-primary shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {categoryLabel} · {FREQUENCY_LABEL[rec.frequency]}
            {expense.merchant && expense.note ? ` · ${expense.merchant}` : ""}
          </p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mt-1">
            Next: {rec.nextOccurrenceDate ? format(parseISO(rec.nextOccurrenceDate), "EEE, d MMM yyyy") : "—"}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
        <p
          className={cn(
            "font-black text-base tabular-nums",
            isIncome ? "text-primary" : "text-foreground",
          )}
        >
          {isIncome ? "+" : "−"}
          {formatAmount(expense.amount)}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-accent transition"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 transition"
          >
            <Ban className="h-3.5 w-3.5" />
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecurringPage() {
  const { expenses, updateExpense } = useExpenses();
  const { categories } = useCategories();
  const { formatAmount } = useCurrency();
  const { showTransactionModal } = useModal();
  const { showToast } = useToast();

  const recurringTemplates = useMemo(
    () =>
      expenses
        .filter((e) => e.recurring?.isRecurring)
        .sort((a, b) => {
          const aNext = a.recurring?.nextOccurrenceDate ?? a.date;
          const bNext = b.recurring?.nextOccurrenceDate ?? b.date;
          return parseISO(aNext).getTime() - parseISO(bNext).getTime();
        }),
    [expenses],
  );

  const categoryName = (id: string) =>
    categories.find((c) => c.id === normalizeCategoryId(id))?.name ?? "Other";

  const handleStop = async (expense: Expense) => {
    if (!window.confirm(`Stop recurring "${expense.note || expense.merchant || "transaction"}"?`)) return;
    try {
      await updateExpense(expense.id, { recurring: undefined });
      showToast("Recurring transaction stopped", "success");
    } catch {
      showToast("Failed to stop recurring transaction", "error");
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] animate-in">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-primary">
              Subscriptions & bills
            </p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
                <Repeat className="h-6 w-6 text-primary" />
              </span>
              Recurring transactions
            </h1>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-xl">
              Update amounts when prices change (e.g. mobile package 1500 → 1700). Tap{" "}
              <strong className="text-foreground">Edit</strong>, change the amount, and save — future auto-entries use
              the new value.
            </p>
          </div>
          <button
            type="button"
            onClick={() => showTransactionModal()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-black uppercase tracking-wider text-primary-foreground shadow-lg transition hover:opacity-95 active:scale-[0.98] shrink-0"
          >
            <Plus className="h-5 w-5" />
            Add recurring
          </button>
        </header>

        <section className="rounded-2xl sm:rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-accent/5">
            <h2 className="text-lg font-black text-foreground">Active templates</h2>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {recurringTemplates.length} active
            </span>
          </div>
          {recurringTemplates.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground font-medium">No recurring transactions yet.</p>
              <p className="text-xs text-muted-foreground">
                When adding a transaction, turn on <strong className="text-foreground">Recurring Transaction</strong> to
                automate it.
              </p>
              <button
                type="button"
                onClick={() => showTransactionModal()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary/10 text-primary px-4 py-2 text-sm font-bold hover:bg-primary/15 transition"
              >
                <Plus className="h-4 w-4" />
                Create one
              </button>
            </div>
          ) : (
            <div>
              {recurringTemplates.map((expense) => (
                <RecurringRow
                  key={expense.id}
                  expense={expense}
                  categoryLabel={categoryName(expense.categoryId)}
                  formatAmount={formatAmount}
                  onEdit={() => showTransactionModal(expense)}
                  onStop={() => handleStop(expense)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

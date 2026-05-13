import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { deleteField } from "firebase/firestore";
import { X, Calendar, Tag, Wallet, ListOrdered, Building2 } from "lucide-react";
import { useSavings } from "../context/SavingsContext";
import { useToast } from "../context/ToastContext";
import { useModalBehavior } from "../hooks/useModalBehavior";
import { useAppSettings } from "../context/AppSettingsContext";
import { useCurrency } from "../hooks/useCurrency";
import { modalBackdropBlurClass } from "../utils/modalBackdrop";
import { amountInWordsPKR } from "../utils/amountInWordsPKR";
import { cn } from "../utils/cn";
import type { SavingsGoal } from "../types";
import { DEFAULT_SAVINGS_GOAL_ICON, SAVINGS_GOAL_ICON_OPTIONS } from "../constants/savingsGoalIconsMeta";

interface SavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGoal?: SavingsGoal | null;
  /** Total income transactions logged for the previous calendar month (hint only). */
  lastMonthLoggedIncome?: number;
  lastMonthLabel?: string;
  /** Logged income for the current calendar month (quick-fill for monthly income). */
  thisMonthLoggedIncome?: number;
  thisMonthLabel?: string;
}

function normalizeStoredIconKey(icon?: string | null): string {
  if (!icon || icon === "Target" || icon === "🎯") return DEFAULT_SAVINGS_GOAL_ICON;
  const keys = new Set(SAVINGS_GOAL_ICON_OPTIONS.map((o) => o.key));
  return keys.has(icon) ? icon : DEFAULT_SAVINGS_GOAL_ICON;
}

function parseOptionalPositiveInt(raw: string): number | undefined {
  const t = raw.trim();
  if (!t || Number.isNaN(Number(t))) return undefined;
  const n = Math.floor(Number(t));
  return n > 0 ? n : undefined;
}

function parseOptionalPriority(raw: string): number | undefined {
  const t = raw.trim();
  if (!t || Number.isNaN(Number(t))) return undefined;
  const n = Math.floor(Number(t));
  if (!Number.isFinite(n) || n < 0 || n > 999) return undefined;
  return n;
}

export const SavingsGoalModal: React.FC<SavingsGoalModalProps> = ({
  isOpen,
  onClose,
  editingGoal,
  lastMonthLoggedIncome = 0,
  lastMonthLabel = "",
  thisMonthLoggedIncome = 0,
  thisMonthLabel = "",
}) => {
  const { addSavingsGoal, updateSavingsGoal } = useSavings();
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const { currency, formatAmount } = useCurrency();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [type, setType] = useState<"short-term" | "long-term">("short-term");
  const [dueDate, setDueDate] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [notes, setNotes] = useState("");
  const [logDepositAsExpense, setLogDepositAsExpense] = useState(true);
  const [iconKey, setIconKey] = useState(DEFAULT_SAVINGS_GOAL_ICON);
  const [linkedAccount, setLinkedAccount] = useState("");
  const [priority, setPriority] = useState("");
  const [goalColor, setGoalColor] = useState("#3b82f6");

  useModalBehavior(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    if (editingGoal) {
      setName(editingGoal.name);
      setDescription(editingGoal.description ?? "");
      setTargetAmount(Number.isFinite(editingGoal.targetAmount) ? String(Math.floor(editingGoal.targetAmount)) : "");
      setType(editingGoal.type);
      setDueDate(editingGoal.dueDate ?? "");
      setMonthlyContribution(
        editingGoal.monthlyContribution != null && editingGoal.monthlyContribution > 0
          ? String(Math.floor(editingGoal.monthlyContribution))
          : "",
      );
      setMonthlyIncome(
        editingGoal.monthlyIncome != null && editingGoal.monthlyIncome > 0
          ? String(Math.floor(editingGoal.monthlyIncome))
          : "",
      );
      setNotes(editingGoal.notes ?? "");
      setLogDepositAsExpense(editingGoal.logDepositAsExpense !== false);
      setIconKey(normalizeStoredIconKey(editingGoal.icon));
      setLinkedAccount(editingGoal.linkedAccount ?? "");
      setPriority(
        editingGoal.priority !== undefined && editingGoal.priority !== null
          ? String(Math.floor(editingGoal.priority))
          : "",
      );
      setGoalColor(editingGoal.color?.trim() ? editingGoal.color : "#3b82f6");
    } else {
      setName("");
      setDescription("");
      setTargetAmount("");
      setType("short-term");
      setDueDate("");
      setMonthlyContribution("");
      setMonthlyIncome("");
      setNotes("");
      setLogDepositAsExpense(true);
      setIconKey(DEFAULT_SAVINGS_GOAL_ICON);
      setLinkedAccount("");
      setPriority("");
      setGoalColor("#3b82f6");
    }
  }, [isOpen, editingGoal]);

  const targetNum = Number(targetAmount);
  const targetWords =
    targetAmount.trim() && Number.isFinite(targetNum) && targetNum >= 0 ? amountInWordsPKR(targetNum) : "";
  const monthlyContribNum = Number(monthlyContribution);
  const monthlyContribWords =
    monthlyContribution.trim() && Number.isFinite(monthlyContribNum) && monthlyContribNum >= 0
      ? amountInWordsPKR(monthlyContribNum)
      : "";
  const monthlyIncomeNum = Number(monthlyIncome);
  const monthlyIncomeWords =
    monthlyIncome.trim() && Number.isFinite(monthlyIncomeNum) && monthlyIncomeNum >= 0
      ? amountInWordsPKR(monthlyIncomeNum)
      : "";

  const currencyLabel = currency === "PKR" ? "PKR" : currency;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount || Number.isNaN(Number(targetAmount))) {
      showToast("Please enter a valid name and target amount", "error");
      return;
    }

    const target = Math.floor(Number(targetAmount));
    if (target <= 0) {
      showToast("Goal cap amount must be greater than zero", "error");
      return;
    }

    try {
      if (editingGoal) {
        const mc = parseOptionalPositiveInt(monthlyContribution);
        const mi = parseOptionalPositiveInt(monthlyIncome);
        const pr = parseOptionalPriority(priority);
        await updateSavingsGoal(editingGoal.id, {
          name,
          description: description.trim() ? description.trim() : deleteField(),
          targetAmount: target,
          type,
          dueDate: dueDate.trim() ? dueDate : deleteField(),
          color: goalColor,
          icon: iconKey,
          monthlyContribution: mc !== undefined ? mc : deleteField(),
          monthlyIncome: mi !== undefined ? mi : deleteField(),
          notes: notes.trim() ? notes.trim() : deleteField(),
          logDepositAsExpense,
          linkedAccount: linkedAccount.trim() ? linkedAccount.trim() : deleteField(),
          priority: pr !== undefined ? pr : deleteField(),
        });
        showToast("Goal updated successfully", "success");
      } else {
        const mc = parseOptionalPositiveInt(monthlyContribution);
        const mi = parseOptionalPositiveInt(monthlyIncome);
        const pr = parseOptionalPriority(priority);
        await addSavingsGoal({
          name,
          description: description.trim() || undefined,
          targetAmount: target,
          type,
          dueDate: dueDate.trim() || undefined,
          color: goalColor,
          icon: iconKey,
          createdAt: new Date().toISOString(),
          monthlyContribution: mc,
          monthlyIncome: mi,
          notes: notes.trim() || undefined,
          logDepositAsExpense,
          linkedAccount: linkedAccount.trim() || undefined,
          priority: pr,
        });
        showToast("Goal added successfully", "success");
      }
      onClose();
    } catch (error) {
      console.error("Error saving goal:", error);
      showToast("Failed to save goal", "error");
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4",
            modalBackdropBlurClass(settings.modalBackdropBlur, settings.reducedMotion),
          )}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl border border-border max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 flex items-center justify-between border-b border-border">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {editingGoal ? "Edit Goal" : "New Financial Goal"}
                </h2>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Amounts in {currencyLabel}
                  {currency === "PKR" ? " (Pakistani Rupees)" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-full"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="p-8 space-y-6"
            >
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Goal Name</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., New Car, Vacation"
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-background border border-border font-semibold focus:ring-2 focus:ring-primary/50 outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short description of your goal"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border font-semibold focus:ring-2 focus:ring-primary/50 outline-none transition resize-none"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Icon</label>
                <div className="grid grid-cols-5 gap-2">
                  {SAVINGS_GOAL_ICON_OPTIONS.map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      title={label}
                      onClick={() => setIconKey(key)}
                      className={cn(
                        "flex h-11 w-full items-center justify-center rounded-xl border transition",
                        iconKey === key
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-background hover:bg-accent",
                      )}
                    >
                      <Icon
                        className="h-5 w-5"
                        aria-hidden
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground">Linked account (optional)</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={linkedAccount}
                      onChange={(e) => setLinkedAccount(e.target.value)}
                      placeholder="e.g. HBL savings"
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-background border border-border font-semibold focus:ring-2 focus:ring-primary/50 outline-none transition"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground">Sort priority (optional)</label>
                  <div className="relative">
                    <ListOrdered className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="number"
                      min={0}
                      max={999}
                      step={1}
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      placeholder="0 = top of list"
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-background border border-border font-semibold focus:ring-2 focus:ring-primary/50 outline-none transition"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Lower numbers appear first on the savings page.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Accent color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={goalColor}
                    onChange={(e) => setGoalColor(e.target.value)}
                    className="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-border bg-background p-1"
                    aria-label="Goal accent color"
                  />
                  <p className="text-xs text-muted-foreground font-medium leading-snug">
                    Used on the card bar, progress fill, and dashboard chip.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground">Goal cap ({currencyLabel})</label>
                  <div className="relative">
                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-background border border-border font-semibold focus:ring-2 focus:ring-primary/50 outline-none transition"
                      required
                    />
                  </div>
                  {targetWords ? (
                    <p className="text-xs text-muted-foreground font-medium leading-snug">{targetWords}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground">Goal Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as "short-term" | "long-term")}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border font-semibold focus:ring-2 focus:ring-primary/50 outline-none transition appearance-none"
                  >
                    <option value="short-term">Short-term</option>
                    <option value="long-term">Long-term</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground">Monthly saving ({currencyLabel})</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                    placeholder="e.g. 40000 from salary"
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border font-semibold focus:ring-2 focus:ring-primary/50 outline-none transition"
                  />
                  {monthlyContribWords ? (
                    <p className="text-xs text-muted-foreground font-medium leading-snug">{monthlyContribWords}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Use this for a fixed amount you add each month; then use “Add deposit” on the goal card.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground">
                    Monthly salary / income ({currencyLabel})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    placeholder="Match your take-home or logged salary"
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border font-semibold focus:ring-2 focus:ring-primary/50 outline-none transition"
                  />
                  {monthlyIncomeWords ? (
                    <p className="text-xs text-muted-foreground font-medium leading-snug">{monthlyIncomeWords}</p>
                  ) : null}
                  {monthlyContribNum > 0 && monthlyIncomeNum > 0 ? (
                    <p className="text-xs font-semibold text-primary">
                      ≈ {((monthlyContribNum / monthlyIncomeNum) * 100).toFixed(1)}% of income toward this goal
                    </p>
                  ) : null}
                  {(thisMonthLoggedIncome > 0 || lastMonthLoggedIncome > 0) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {thisMonthLoggedIncome > 0 ? (
                        <button
                          type="button"
                          onClick={() => setMonthlyIncome(String(Math.floor(thisMonthLoggedIncome)))}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 transition"
                        >
                          Use {thisMonthLabel || "this month"}: {formatAmount(thisMonthLoggedIncome)}
                        </button>
                      ) : null}
                      {lastMonthLoggedIncome > 0 ? (
                        <button
                          type="button"
                          onClick={() => setMonthlyIncome(String(Math.floor(lastMonthLoggedIncome)))}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-border bg-accent/30 text-foreground hover:bg-accent/50 transition"
                        >
                          Use {lastMonthLabel || "last month"}: {formatAmount(lastMonthLoggedIncome)}
                        </button>
                      ) : null}
                    </div>
                  )}
                  {thisMonthLoggedIncome > 0 || lastMonthLoggedIncome > 0 ? (
                    <p className="text-xs font-medium text-muted-foreground leading-snug">
                      Quick-fill uses <strong className="text-foreground">logged salary / income</strong> from History —
                      the same totals you use for expenses and cash flow.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-accent/20 px-4 py-3 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={logDepositAsExpense}
                    onChange={(e) => setLogDepositAsExpense(e.target.checked)}
                    className="mt-1 rounded border-border"
                  />
                  <span>
                    <span className="text-sm font-bold text-foreground">Log deposits as expenses</span>
                    <span className="block text-xs text-muted-foreground font-medium leading-snug mt-1">
                      When on, each time you add to this goal we also record an expense under “Savings / Goal deposit”
                      so your monthly spend (vs salary) includes money you set aside. Turn off if you only want the goal
                      balance without affecting budget totals.
                    </span>
                  </span>
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Private reminders, account names, etc."
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border font-semibold focus:ring-2 focus:ring-primary/50 outline-none transition resize-none"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">Due Date (Optional)</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-background border border-border font-semibold focus:ring-2 focus:ring-primary/50 outline-none transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 rounded-xl border border-border font-bold text-sm uppercase tracking-wider hover:bg-accent transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-105 transition"
                >
                  {editingGoal ? "Update Goal" : "Save Goal"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
};

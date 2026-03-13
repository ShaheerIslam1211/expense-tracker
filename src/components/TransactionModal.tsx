import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Tag, CreditCard, Wallet, Repeat, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useExpenses } from "../context/ExpenseContext";
import { useCategories } from "../context/CategoryContext";
import { useCards } from "../context/CardContext";
import { useToast } from "../context/ToastContext";
import { format, parseISO } from "date-fns";
import { cn } from "../utils/cn";
import { useCurrency } from "../hooks/useCurrency";
import { getCurrencyConfig } from "../utils/currency";
import type { Expense, CategoryId, PaymentMethodType, TransactionType, RecurringFrequency } from "../types";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: Expense;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, editingTransaction }) => {
  const { addExpense, updateExpense } = useExpenses();
  const { categories } = useCategories();
  const { cards } = useCards();
  const { showToast } = useToast();
  const { currency } = useCurrency();

  // Form State
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<CategoryId>("other");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethodType, setPaymentMethodType] = useState<PaymentMethodType>("cash");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type || "expense");
      setAmount(String(editingTransaction.amount));
      setCategoryId(editingTransaction.categoryId);
      setNote(editingTransaction.note);
      setDate(format(parseISO(editingTransaction.date), "yyyy-MM-dd"));
      setPaymentMethodType(editingTransaction.paymentMethodType);
      setPaymentMethodId(editingTransaction.paymentMethodId || "");
      setIsRecurring(editingTransaction.recurring?.isRecurring || false);
      setFrequency(editingTransaction.recurring?.frequency || "monthly");
    } else {
      // Reset form
      setType("expense");
      setAmount("");
      setCategoryId("other");
      setNote("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setPaymentMethodType("cash");
      setPaymentMethodId("");
      setIsRecurring(false);
      setFrequency("monthly");
    }
  }, [editingTransaction, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    setIsSaving(true);

    const transactionData: Omit<Expense, "id" | "createdAt"> = {
      type,
      amount: Number(amount),
      currency: currency,
      categoryId,
      note,
      date: new Date(date).toISOString(),
      paymentMethodType,
      paymentMethodId: paymentMethodType === "card" ? paymentMethodId : undefined,
    };

    if (isRecurring) {
      transactionData.recurring = {
        isRecurring: true,
        frequency,
        nextOccurrenceDate: new Date(date).toISOString(), // Start from selected date
      };
    }

    try {
      if (editingTransaction) {
        await updateExpense(editingTransaction.id, transactionData);
        showToast("Transaction updated successfully", "success");
      } else {
        await addExpense(transactionData);
        showToast("Transaction added successfully", "success");
      }
      onClose();
    } catch (error) {
      console.error("Error saving transaction:", error);
      showToast("Failed to save transaction", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (type === "income") return ["salary", "bonus", "investment", "other"].includes(c.id);
    return !["salary", "bonus", "investment"].includes(c.id);
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
            {/* Modal */}
            <motion.div
              initial={{ y: "100%", opacity: 1, scale: 1 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-xl bg-background border-t sm:border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto"
            >
              {/* Header */}
              <div className="p-6 flex items-center justify-between border-b border-border bg-card">
                <h2 className="text-xl font-black text-foreground">
                  {editingTransaction ? "Edit Transaction" : "Add Transaction"}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-accent rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="p-6 overflow-y-auto space-y-6"
              >
                {/* Type Toggle */}
                <div className="flex p-1 bg-accent/30 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setType("expense")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all",
                      type === "expense"
                        ? "bg-danger text-white shadow-lg"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ArrowDownCircle className="h-5 w-5" />
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("income")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all",
                      type === "income"
                        ? "bg-success text-white shadow-lg"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ArrowUpCircle className="h-5 w-5" />
                    Income
                  </button>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="text-sm font-black text-muted-foreground uppercase tracking-widest">Amount</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground">
                      {getCurrencyConfig(currency)?.symbol}
                    </div>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      className="w-full pl-14 pr-6 py-5 bg-card border border-border rounded-2xl text-3xl font-black focus:border-primary outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-black text-muted-foreground uppercase tracking-widest">Category</label>
                  <div className="grid grid-cols-4 gap-3">
                    {filteredCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryId(cat.id)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                          categoryId === cat.id
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-card border-border text-muted-foreground hover:bg-accent",
                        )}
                      >
                        <span className="text-2xl">{cat.icon}</span>
                        <span className="text-[10px] font-bold uppercase truncate w-full text-center">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-muted-foreground uppercase tracking-widest">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl font-bold focus:border-primary outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-muted-foreground uppercase tracking-widest">
                      Description
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="What was this for?"
                        className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl font-bold focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-3">
                  <label className="text-sm font-black text-muted-foreground uppercase tracking-widest">
                    Payment Method
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethodType("cash")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border font-bold transition-all",
                        paymentMethodType === "cash"
                          ? "bg-success/10 border-success text-success shadow-sm"
                          : "bg-card border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      <Wallet className="h-5 w-5" />
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethodType("card")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border font-bold transition-all",
                        paymentMethodType === "card"
                          ? "bg-primary/10 border-primary text-primary shadow-sm"
                          : "bg-card border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      <CreditCard className="h-5 w-5" />
                      Card
                    </button>
                  </div>

                  {paymentMethodType === "card" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="pt-2"
                    >
                      <select
                        value={paymentMethodId}
                        onChange={(e) => setPaymentMethodId(e.target.value)}
                        className="w-full px-4 py-4 bg-card border border-border rounded-2xl font-bold outline-none focus:border-primary transition-all"
                        required={paymentMethodType === "card"}
                      >
                        <option value="">Select a card</option>
                        {cards.map((card) => (
                          <option
                            key={card.id}
                            value={card.id}
                          >
                            {card.bankName} (**** {card.cardNumber.slice(-4)})
                          </option>
                        ))}
                      </select>
                    </motion.div>
                  )}
                </div>

                {/* Recurring Options */}
                <div className="p-4 bg-accent/20 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl text-primary">
                        <Repeat className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-black text-sm text-foreground">Recurring Transaction</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Automate this entry</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRecurring(!isRecurring)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        isRecurring ? "bg-primary" : "bg-border",
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          isRecurring ? "left-7" : "left-1",
                        )}
                      />
                    </button>
                  </div>

                  {isRecurring && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="grid grid-cols-2 gap-3"
                    >
                      {(["daily", "weekly", "monthly", "yearly"] as RecurringFrequency[]).map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => setFrequency(freq)}
                          className={cn(
                            "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                            frequency === freq
                              ? "bg-primary border-primary text-white"
                              : "bg-card border-border text-muted-foreground hover:bg-accent",
                          )}
                        >
                          {freq}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </form>

              {/* Footer */}
              <div className="p-6 border-t border-border bg-card flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl border border-border font-black text-xs uppercase tracking-widest hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingTransaction ? "Update" : "Add Transaction"}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CreditCard, Trash2, Edit2, Calendar, User, Hash, Eye, EyeOff } from "lucide-react";
import { useCards } from "../context/CardContext";
import { useExpenses } from "../context/ExpenseContext";
import { useCurrency } from "../hooks/useCurrency";
import { useToast } from "../context/ToastContext";
import { cn } from "../utils/cn";
import { getCurrencyConfig } from "../utils/currency";
import type { Card } from "../types";
import { maskAmount, useSensitiveMode } from "../hooks/useSensitiveMode";
import { useModalBehavior } from "../hooks/useModalBehavior";

function getCardDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function formatCardNumber(value: string): string {
  const digits = getCardDigits(value).slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function maskCardNumber(value: string): string {
  const digits = getCardDigits(value);
  if (!digits) return value;
  const masked = `${"•".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
  return masked.replace(/(.{4})/g, "$1 ").trim();
}

const CardItem = ({
  card,
  onDelete,
  onEdit,
  hideSensitiveValues,
}: {
  card: Card;
  onDelete: (id: string) => void;
  onEdit: (card: Card) => void;
  hideSensitiveValues: boolean;
}) => {
  const { getBalances, expenses } = useExpenses();
  const { formatAmount } = useCurrency();
  const { cards: cardBalances } = getBalances();
  const [showCardNumber, setShowCardNumber] = useState(false);

  const balance = (card.startingBalance || 0) + (cardBalances[card.id] || 0);

  // Calculate spending this month on this card
  const now = new Date();
  const monthSpending = expenses
    .filter(
      (e) =>
        e.paymentMethodId === card.id &&
        e.type === "expense" &&
        new Date(e.date).getMonth() === now.getMonth() &&
        new Date(e.date).getFullYear() === now.getFullYear(),
    )
    .reduce((sum, e) => sum + e.amount, 0);

  const limitProgress = card.limit ? Math.min((monthSpending / card.limit) * 100, 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative"
    >
      <div
        className="relative p-8 rounded-[2rem] text-white shadow-2xl overflow-hidden min-h-[240px] transition-all group-hover:shadow-primary/20"
        style={{ backgroundColor: card.color || "#3b82f6" }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <CreditCard className="h-32 w-32 rotate-12" />
        </div>
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">{card.bankName}</p>
              <h3 className="text-xl font-black tracking-tight">{card.cardHolderName}</h3>
            </div>
            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              {card.cardType}
            </div>
          </div>

          <div className="mt-8">
            <p className="text-2xl font-mono tracking-[0.15em] drop-shadow-lg flex items-center gap-3">
              <span>{showCardNumber ? formatCardNumber(card.cardNumber) : maskCardNumber(card.cardNumber)}</span>
              <button
                type="button"
                onClick={() => setShowCardNumber((prev) => !prev)}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                aria-label={showCardNumber ? "Hide card number" : "Show card number"}
                title={showCardNumber ? "Hide card number" : "Show card number"}
              >
                {showCardNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </p>
          </div>

          <div className="flex justify-between items-end mt-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Balance</p>
              <p className="text-2xl font-black">{maskAmount(formatAmount(balance), hideSensitiveValues)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(card)}
                className="bg-white/20 hover:bg-white/30 p-2.5 rounded-xl backdrop-blur-md transition-all active:scale-90"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(card.id)}
                className="bg-white/20 hover:bg-red-500/40 p-2.5 rounded-xl backdrop-blur-md transition-all active:scale-90"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card Stats Overlay */}
      {card.limit && (
        <div className="mt-4 bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Monthly Limit
            </span>
            <span className="text-[10px] font-black text-foreground uppercase tracking-widest">
              {maskAmount(formatAmount(monthSpending), hideSensitiveValues)} /{" "}
              {maskAmount(formatAmount(card.limit), hideSensitiveValues)}
            </span>
          </div>
          <div className="h-1.5 bg-accent/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${limitProgress}%` }}
              className={cn(
                "h-full rounded-full transition-all",
                limitProgress > 90 ? "bg-danger" : limitProgress > 70 ? "bg-warning" : "bg-success",
              )}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default function Cards() {
  const { cards, addCard, deleteCard, updateCard } = useCards();
  const { showToast } = useToast();
  const { currency } = useCurrency();
  const { hideSensitiveValues, toggleSensitiveValues } = useSensitiveMode();
  const [isAdding, setIsAdding] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  useModalBehavior(isAdding, () => setIsAdding(false));

  const [formData, setFormData] = useState<Omit<Card, "id">>({
    bankName: "",
    cardHolderName: "",
    cardNumber: "",
    expiryDate: "",
    cardType: "visa",
    color: "#3b82f6",
    startingBalance: 0,
    limit: 0,
    billingCycleStart: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCardData: Omit<Card, "id"> = {
      ...formData,
      cardNumber: getCardDigits(formData.cardNumber),
    };
    try {
      if (editingCard) {
        await updateCard(editingCard.id, normalizedCardData);
        showToast("Card updated successfully", "success");
      } else {
        await addCard(normalizedCardData);
        showToast("Card added successfully", "success");
      }
      handleClose();
    } catch (error) {
      console.error("Error saving card:", error);
      showToast("Failed to save card", "error");
    }
  };

  const handleEdit = (card: Card) => {
    setEditingCard(card);
    setFormData({
      bankName: card.bankName ?? "",
      cardHolderName: card.cardHolderName ?? "",
      cardNumber: formatCardNumber(card.cardNumber ?? ""),
      expiryDate: card.expiryDate ?? "",
      cardType: card.cardType ?? "visa",
      color: card.color ?? "#3b82f6",
      startingBalance: card.startingBalance ?? 0,
      limit: card.limit || 0,
      billingCycleStart: card.billingCycleStart || 1,
    });
    setIsAdding(true);
  };

  const handleClose = () => {
    setIsAdding(false);
    setEditingCard(null);
    setFormData({
      bankName: "",
      cardHolderName: "",
      cardNumber: "",
      expiryDate: "",
      cardType: "visa",
      color: "#3b82f6",
      startingBalance: 0,
      limit: 0,
      billingCycleStart: 1,
    });
  };

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-8 sm:space-y-10 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">My Wallets</h1>
          <p className="text-muted-foreground mt-1 font-medium">Manage your cards and bank accounts.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={toggleSensitiveValues}
            className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest text-foreground"
            aria-label={hideSensitiveValues ? "Show card balances" : "Hide card balances"}
            title={hideSensitiveValues ? "Show balances" : "Hide balances"}
          >
            {hideSensitiveValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {hideSensitiveValues ? "Show Balances" : "Hide Balances"}
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-primary text-primary-foreground px-5 sm:px-6 py-3 sm:py-4 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 sm:gap-3"
          >
            <Plus className="h-5 w-5" />
            Add New Card
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          >
            <motion.form
              onSubmit={handleSubmit}
              className="bg-card w-full max-w-2xl rounded-t-[2.2rem] sm:rounded-[2.5rem] shadow-2xl border border-border overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 sm:p-8 border-b border-border bg-accent/10 flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl font-black text-foreground">{editingCard ? "Edit Card" : "Add New Card"}</h2>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 hover:bg-accent rounded-full transition-colors"
                >
                  <Plus className="h-6 w-6 rotate-45" />
                </button>
              </div>

              <div className="p-5 sm:p-8 space-y-6 max-h-[78vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bank Name */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Bank Name
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        className="w-full pl-12 pr-4 py-4 bg-accent/10 border border-border rounded-2xl font-bold focus:border-primary outline-none transition-all"
                        placeholder="e.g. Allied Bank"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Card Holder */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Card Holder
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        className="w-full pl-12 pr-4 py-4 bg-accent/10 border border-border rounded-2xl font-bold focus:border-primary outline-none transition-all"
                        placeholder="John Doe"
                        value={formData.cardHolderName}
                        onChange={(e) => setFormData({ ...formData, cardHolderName: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Card Number */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Card Number
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        maxLength={19}
                        className="w-full pl-12 pr-4 py-4 bg-accent/10 border border-border rounded-2xl font-bold focus:border-primary outline-none transition-all"
                        placeholder="XXXX XXXX XXXX XXXX"
                        value={formData.cardNumber ?? ""}
                        onChange={(e) => setFormData({ ...formData, cardNumber: formatCardNumber(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Expiry Date */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Expiry Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        placeholder="MM/YY"
                        className="w-full pl-12 pr-4 py-4 bg-accent/10 border border-border rounded-2xl font-bold focus:border-primary outline-none transition-all"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Starting Balance */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Starting Balance
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground">
                        {getCurrencyConfig(currency)?.symbol}
                      </div>
                      <input
                        type="number"
                        required
                        className="w-full pl-12 pr-4 py-4 bg-accent/10 border border-border rounded-2xl font-bold focus:border-primary outline-none transition-all"
                        placeholder="0.00"
                        value={formData.startingBalance ?? 0}
                        onChange={(e) => setFormData({ ...formData, startingBalance: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Monthly Limit */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Monthly Limit (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground">
                        {getCurrencyConfig(currency)?.symbol}
                      </div>
                      <input
                        type="number"
                        className="w-full pl-12 pr-4 py-4 bg-accent/10 border border-border rounded-2xl font-bold focus:border-primary outline-none transition-all"
                        placeholder="0.00"
                        value={formData.limit ?? 0}
                        onChange={(e) => setFormData({ ...formData, limit: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                {/* Color Selection */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                    Card Theme
                  </label>
                  <div className="flex flex-wrap gap-4">
                    {["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#000000", "#ec4899", "#8b5cf6"].map(
                      (c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: c })}
                          className={cn(
                            "w-12 h-12 rounded-2xl border-4 transition-all hover:scale-110",
                            formData.color === c ? "border-foreground scale-110 shadow-lg" : "border-transparent",
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-8 border-t border-border bg-accent/5 flex gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-4 rounded-2xl border border-border font-black text-xs uppercase tracking-widest hover:bg-accent transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {editingCard ? "Update Card" : "Save Card"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8">
        <AnimatePresence>
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onDelete={deleteCard}
              onEdit={handleEdit}
              hideSensitiveValues={hideSensitiveValues}
            />
          ))}
        </AnimatePresence>

        {cards.length === 0 && !isAdding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full py-20 text-center space-y-4 bg-card rounded-[3rem] border-4 border-dashed border-border"
          >
            <div className="w-20 h-20 bg-accent rounded-3xl flex items-center justify-center mx-auto mb-6">
              <CreditCard className="h-10 w-10 text-muted-foreground opacity-50" />
            </div>
            <h2 className="text-2xl font-black text-foreground">No Cards Found</h2>
            <p className="text-muted-foreground max-w-sm mx-auto font-medium">
              Start by adding your first bank card or wallet to track your finances accurately.
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="text-primary font-black uppercase tracking-widest text-xs mt-4"
            >
              Add your first card
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

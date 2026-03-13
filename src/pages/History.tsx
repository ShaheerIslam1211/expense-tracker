import { useState } from "react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import {
  Search,
  Filter,
  Download,
  Calendar as CalendarIcon,
  Edit2,
  Trash2,
  Eye,
  Repeat,
  ArrowUpCircle,
  FileText,
  FileDown,
} from "lucide-react";
import { useExpenses } from "../context/ExpenseContext";
import { useCategories } from "../context/CategoryContext";
import { useCards } from "../context/CardContext";
import { useToast } from "../context/ToastContext";
import type { Expense, Card } from "../types";
import { useCurrency } from "../hooks/useCurrency";
import { cn } from "../utils/cn";
import { exportToCSV, exportToPDF } from "../utils/export";
import { useModal } from "../context/ModalContext";

function ExpenseRow({
  expense,
  categories,
  cards,
  onDelete,
  onEdit,
  onPhotoClick,
  formatAmount,
}: {
  expense: Expense;
  categories: Array<{ id: string; icon: string; color: string; name: string }>;
  cards: Card[];
  onDelete: () => void;
  onEdit: () => void;
  onPhotoClick: () => void;
  formatAmount: (amount: number) => string;
}) {
  const cat = categories.find((c) => c.id === expense.categoryId) ?? {
    id: "other",
    icon: "📌",
    color: "#71717a",
    name: "Other",
  };
  const card = expense.paymentMethodType === "card" ? cards.find((c) => c.id === expense.paymentMethodId) : null;
  const isIncome = expense.type === "income";

  return (
    <div className="group relative bg-card border border-border rounded-2xl p-4 hover:bg-accent/30 transition-all cursor-pointer overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm shrink-0",
              isIncome ? "bg-success/20 text-success" : "bg-accent text-foreground",
            )}
            style={{ backgroundColor: !isIncome ? cat.color + "20" : undefined }}
          >
            {cat.icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-foreground truncate">{expense.note || expense.merchant || cat.name}</p>
              {expense.recurring?.isRecurring && <Repeat className="h-3 w-3 text-primary" />}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <div className="flex items-center gap-1 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                <CalendarIcon className="h-3 w-3" />
                {format(parseISO(expense.date), "dd MMM yyyy")}
              </div>

              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter",
                  expense.paymentMethodType === "cash"
                    ? "bg-success/10 text-success border border-success/10"
                    : "bg-primary/10 text-primary border border-primary/10",
                )}
              >
                {expense.paymentMethodType === "cash" ? "💵 Cash" : `💳 ${card?.bankName || "Card"}`}
              </div>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 flex flex-col items-end gap-2">
          <p className={cn("text-lg font-black tracking-tight", isIncome ? "text-success" : "text-foreground")}>
            {isIncome ? "+" : "-"}
            {formatAmount(expense.amount)}
          </p>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {expense.photoDataUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPhotoClick();
                }}
                className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-colors"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-colors"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 hover:bg-danger/10 rounded-lg text-danger transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function History() {
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [photoModal, setPhotoModal] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { showTransactionModal } = useModal();

  const { expenses: allExpenses, deleteExpense } = useExpenses();
  const { showToast } = useToast();
  const { categories } = useCategories();
  const { cards } = useCards();
  const { formatAmount } = useCurrency();

  const expenses = allExpenses
    .filter((e) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        e.note.toLowerCase().includes(q) ||
        String(e.amount).includes(search) ||
        (e.customCategory?.toLowerCase().includes(q) ?? false) ||
        (e.merchant?.toLowerCase().includes(q) ?? false);
      const matchCat = categoryFilter === "all" || e.categoryId === categoryFilter;
      const matchType = typeFilter === "all" || e.type === typeFilter;

      const transactionDate = parseISO(e.date);
      const matchDate = isWithinInterval(transactionDate, {
        start: startOfDay(parseISO(startDate)),
        end: endOfDay(parseISO(endDate)),
      });

      return matchSearch && matchCat && matchType && matchDate;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDelete = async (expense: Expense) => {
    if (window.confirm(`Delete transaction "${expense.note || "Transaction"}" (${formatAmount(expense.amount)})?`)) {
      try {
        await deleteExpense(expense.id);
        showToast("Transaction deleted", "success");
      } catch (error) {
        console.error("Error deleting transaction:", error);
        showToast("Failed to delete", "error");
      }
    }
  };

  return (
    <div className="space-y-8 animate-in p-4 md:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">History</h1>
          <p className="text-muted-foreground mt-1 font-medium">Review and manage your past transactions.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToCSV(expenses)}
            disabled={expenses.length === 0}
            className="bg-accent/30 text-foreground px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-border hover:bg-accent transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={() => exportToPDF(expenses)}
            disabled={expenses.length === 0}
            className="bg-accent/30 text-foreground px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-border hover:bg-accent transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search note, amount, merchant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-accent/10 border border-border rounded-xl font-bold focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-accent/10 border border-border rounded-xl font-bold appearance-none outline-none focus:border-primary transition-all"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                >
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <ArrowUpCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-accent/10 border border-border rounded-xl font-bold appearance-none outline-none focus:border-primary transition-all"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
              Start Date
            </label>
            <div className="relative">
              <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-accent/10 border border-border rounded-xl font-bold focus:border-primary outline-none transition-all"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
              End Date
            </label>
            <div className="relative">
              <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-accent/10 border border-border rounded-xl font-bold focus:border-primary outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
          <FileText className="h-4 w-4" />
          <span>{expenses.length} Transactions Found</span>
        </div>
      </div>

      <div className="space-y-4">
        {expenses.length > 0 ? (
          expenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              categories={categories}
              cards={cards}
              onDelete={() => handleDelete(expense)}
              onEdit={() => showTransactionModal(expense)}
              onPhotoClick={() => (expense.photoDataUrl ? setPhotoModal(expense.photoDataUrl) : null)}
              formatAmount={formatAmount}
            />
          ))
        ) : (
          <div className="rounded-[2.5rem] bg-card border border-border border-dashed p-20 text-center">
            <p className="text-muted-foreground font-black uppercase tracking-widest text-sm">
              No transactions matched your filters.
            </p>
          </div>
        )}
      </div>

      {photoModal && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-8 backdrop-blur-sm"
          onClick={() => setPhotoModal(null)}
        >
          <img
            src={photoModal}
            alt="Receipt"
            className="max-w-full max-h-full object-contain rounded-[2rem] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

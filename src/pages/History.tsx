import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
  format,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  startOfYear,
} from "date-fns";
import {
  Download,
  Calendar as CalendarIcon,
  Edit2,
  Trash2,
  Eye,
  Repeat,
  FileDown,
  X,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw,
  Image as ImageIcon,
} from "lucide-react";
import { useExpenses } from "../context/ExpenseContext";
import { useCategories } from "../context/CategoryContext";
import { useCards } from "../context/CardContext";
import { useToast } from "../context/ToastContext";
import type { Expense, Card } from "../types";
import { useCurrency } from "../hooks/useCurrency";
import { maskAmount, useSensitiveMode } from "../hooks/useSensitiveMode";
import { cn } from "../utils/cn";
import { exportToCSV, exportToPDF } from "../utils/export";
import { useModal } from "../context/ModalContext";
import { useModalBehavior } from "../hooks/useModalBehavior";
import { useAppSettings } from "../context/AppSettingsContext";
import { modalBackdropBlurClass } from "../utils/modalBackdrop";
import { getExpenseReceiptUrls } from "../utils/expenseReceiptStorage";
import { useIsMobile } from "../hooks/useIsMobile";
import {
  HistoryFiltersForm,
  HistoryInsightsColumn,
  type DatePresetId,
  type SortId,
} from "./history/HistoryPanels";

const HISTORY_PAGE_SIZE_KEY = "expense-tracker-history-page-size";

function loadHistoryPageSize(): number {
  try {
    const raw = localStorage.getItem(HISTORY_PAGE_SIZE_KEY);
    const n = Number(raw);
    if (n === 25 || n === 50 || n === 100) return n;
  } catch {
    /* ignore */
  }
  return 50;
}

function ExpenseRow({
  expense,
  categories,
  cards,
  onDelete,
  onEdit,
  onPhotoClick,
  onOpen,
  formatAmount,
}: {
  expense: Expense;
  categories: Array<{ id: string; icon: string; color: string; name: string }>;
  cards: Card[];
  onDelete: () => void;
  onEdit: () => void;
  onPhotoClick: () => void;
  onOpen: () => void;
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
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group relative bg-card border border-border rounded-2xl p-3 sm:p-4 hover:bg-accent/30 transition-all cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-start gap-2 sm:gap-4 flex-1 min-w-0">
          <div
            className={cn(
              "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg sm:text-xl shadow-sm shrink-0",
              isIncome ? "bg-success/20 text-success" : "bg-accent text-foreground",
            )}
            style={{ backgroundColor: !isIncome ? cat.color + "20" : undefined }}
          >
            {cat.icon}
          </div>

          <div className="min-w-0 flex-1 pr-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-foreground text-sm sm:text-base line-clamp-2 sm:truncate break-words">
                {expense.note || expense.merchant || cat.name}
              </p>
              {expense.recurring?.isRecurring && <Repeat className="h-3 w-3 text-primary" />}
              {isIncome && expense.dadRecovery && (
                <span className="text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 shrink-0">
                  Dad payback
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <div className="flex items-center gap-1 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                <CalendarIcon className="h-3 w-3" />
                {format(parseISO(expense.date), "dd MMM yyyy")}
              </div>

              <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[140px]">{cat.name}</span>

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

              {getExpenseReceiptUrls(expense).length > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-black text-primary uppercase tracking-tighter">
                  <ImageIcon className="h-3 w-3" />
                  Receipt
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 flex flex-col items-end gap-1 sm:gap-2 max-w-[42%] sm:max-w-none">
          <p
            className={cn(
              "text-sm sm:text-lg font-black tracking-tight tabular-nums break-all leading-tight",
              isIncome ? "text-success" : "text-foreground",
            )}
          >
            {isIncome ? "+" : "-"}
            {formatAmount(expense.amount)}
          </p>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {getExpenseReceiptUrls(expense).length > 0 && (
              <button
                type="button"
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
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-colors"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              type="button"
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
  const [searchParams, setSearchParams] = useSearchParams();
  const presetFromUrl = searchParams.get("preset");

  const [startDate, setStartDate] = useState(
    format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [photoModalExpense, setPhotoModalExpense] = useState<Expense | null>(null);
  const [receiptSlideIndex, setReceiptSlideIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "cash" | "card">("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [receiptsOnly, setReceiptsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortId>("newest");
  const [datePreset, setDatePreset] = useState<DatePresetId>("month");
  const [groupByDay, setGroupByDay] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(loadHistoryPageSize);

  const setPageSizePersisted = useCallback((n: number) => {
    setPageSizeState(n);
    try {
      localStorage.setItem(HISTORY_PAGE_SIZE_KEY, String(n));
    } catch {
      /* ignore */
    }
  }, []);

  const closePhotoModal = () => setPhotoModalExpense(null);

  const { showTransactionModal } = useModal();

  const { expenses: allExpenses, deleteExpense } = useExpenses();
  const { showToast } = useToast();
  const { categories } = useCategories();
  const { cards } = useCards();
  const { formatAmount } = useCurrency();
  const { hideSensitiveValues } = useSensitiveMode();
  const { settings } = useAppSettings();

  const displayAmount = useCallback(
    (n: number) => maskAmount(formatAmount(n), hideSensitiveValues),
    [formatAmount, hideSensitiveValues],
  );
  useModalBehavior(Boolean(photoModalExpense), closePhotoModal);

  const isMobile = useIsMobile(768);
  const [mobileFilterSheetOpen, setMobileFilterSheetOpen] = useState(false);

  const closeMobileFilterSheet = useCallback(() => {
    setMobileFilterSheetOpen(false);
  }, []);

  /** Always use stack-based lock (do not also set body.style.overflow — that breaks popBodyScrollLock). */
  useModalBehavior(isMobile && mobileFilterSheetOpen, closeMobileFilterSheet, { lockScroll: true });

  useEffect(() => {
    if (!isMobile) setMobileFilterSheetOpen(false);
  }, [isMobile]);

  useEffect(() => {
    setReceiptSlideIndex(0);
  }, [photoModalExpense?.id]);

  const applyDatePreset = useCallback((preset: Exclude<DatePresetId, "custom">) => {
    const today = new Date();
    setDatePreset(preset);
    if (preset === "month") {
      setStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
      return;
    }
    if (preset === "last7") {
      setStartDate(format(subDays(today, 6), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
      return;
    }
    if (preset === "last30") {
      setStartDate(format(subDays(today, 29), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
      return;
    }
    if (preset === "year") {
      setStartDate(format(startOfYear(today), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
      return;
    }
    setStartDate("2000-01-01");
    setEndDate(format(today, "yyyy-MM-dd"));
  }, []);

  useEffect(() => {
    if (!presetFromUrl) return;
    const p = presetFromUrl;
    if (p === "last7") applyDatePreset("last7");
    else if (p === "last30") applyDatePreset("last30");
    else if (p === "month") applyDatePreset("month");
    else if (p === "year") applyDatePreset("year");
    else if (p === "all") applyDatePreset("all");
    setSearchParams({}, { replace: true });
  }, [presetFromUrl, applyDatePreset, setSearchParams]);

  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const som = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const l7 = format(subDays(new Date(), 6), "yyyy-MM-dd");
    const l30 = format(subDays(new Date(), 29), "yyyy-MM-dd");
    const yStart = format(startOfYear(new Date()), "yyyy-MM-dd");
    if (startDate === som && endDate === today) setDatePreset("month");
    else if (startDate === l7 && endDate === today) setDatePreset("last7");
    else if (startDate === l30 && endDate === today) setDatePreset("last30");
    else if (startDate === yStart && endDate === today) setDatePreset("year");
    else if (startDate === "2000-01-01" && endDate === today) setDatePreset("all");
    else setDatePreset("custom");
  }, [startDate, endDate]);

  const filteredAndSorted = useMemo(() => {
    const q = search.toLowerCase().trim();
    const minN = parseFloat(minAmount.replace(/,/g, ""));
    const maxN = parseFloat(maxAmount.replace(/,/g, ""));
    const hasMin = !Number.isNaN(minN) && minAmount.trim() !== "";
    const hasMax = !Number.isNaN(maxN) && maxAmount.trim() !== "";

    const rangeStart = startOfDay(parseISO(startDate));
    const rangeEnd = endOfDay(parseISO(endDate));

    const list = allExpenses.filter((e) => {
      const matchSearch =
        !q ||
        e.note.toLowerCase().includes(q) ||
        String(e.amount).includes(search.trim()) ||
        (e.customCategory?.toLowerCase().includes(q) ?? false) ||
        (e.merchant?.toLowerCase().includes(q) ?? false) ||
        (e.reference?.toLowerCase().includes(q) ?? false);
      const matchCat = categoryFilter === "all" || e.categoryId === categoryFilter;
      const matchType = typeFilter === "all" || e.type === typeFilter;
      const matchPay = paymentFilter === "all" || e.paymentMethodType === paymentFilter;
      const matchReceipt =
        !receiptsOnly || getExpenseReceiptUrls(e).length > 0 || Boolean(e.photoUrl || e.photoDataUrl);

      const transactionDate = parseISO(e.date);
      const matchDate = isWithinInterval(transactionDate, { start: rangeStart, end: rangeEnd });

      if (!matchSearch || !matchCat || !matchType || !matchPay || !matchReceipt || !matchDate) return false;
      if (hasMin && e.amount < minN) return false;
      if (hasMax && e.amount > maxN) return false;
      return true;
    });

    const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

    list.sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === "highest") return b.amount - a.amount || new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "lowest") return a.amount - b.amount || new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "category") {
        const cmp = catName(a.categoryId).localeCompare(catName(b.categoryId));
        return cmp !== 0 ? cmp : new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return list;
  }, [
    allExpenses,
    search,
    categoryFilter,
    typeFilter,
    paymentFilter,
    minAmount,
    maxAmount,
    receiptsOnly,
    startDate,
    endDate,
    sortBy,
    categories,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    categoryFilter,
    typeFilter,
    paymentFilter,
    minAmount,
    maxAmount,
    receiptsOnly,
    startDate,
    endDate,
    sortBy,
  ]);

  const totalExpenseAmount = filteredAndSorted.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const totalIncomeAmount = filteredAndSorted.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const netAmount = totalIncomeAmount - totalExpenseAmount;
  const averageAmount =
    filteredAndSorted.length > 0 ? filteredAndSorted.reduce((s, e) => s + e.amount, 0) / filteredAndSorted.length : 0;
  const expenseCount = filteredAndSorted.filter((e) => e.type === "expense").length;
  const incomeCount = filteredAndSorted.filter((e) => e.type === "income").length;

  const topExpenseCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredAndSorted) {
      if (e.type !== "expense") continue;
      map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + e.amount);
    }
    const rows = [...map.entries()]
      .map(([id, amount]) => ({
        id,
        amount,
        name: categories.find((c) => c.id === id)?.name ?? id,
        color: categories.find((c) => c.id === id)?.color ?? "#6366f1",
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    const max = rows[0]?.amount ?? 1;
    return rows.map((r) => ({ ...r, pct: max > 0 ? Math.round((r.amount / max) * 100) : 0 }));
  }, [filteredAndSorted, categories]);

  const duplicateCandidates = Object.values(
    filteredAndSorted
      .filter((e) => e.type === "expense")
      .reduce<Record<string, Expense[]>>((acc, expense) => {
        const textKey = (expense.merchant || expense.note || "").trim().toLowerCase().slice(0, 20);
        const key = `${expense.date.slice(0, 10)}|${expense.amount.toFixed(2)}|${textKey}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(expense);
        return acc;
      }, {}),
  )
    .filter((group) => group.length > 1)
    .sort((a, b) => b.length - a.length);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginated = filteredAndSorted.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setTypeFilter("all");
    setPaymentFilter("all");
    setMinAmount("");
    setMaxAmount("");
    setReceiptsOnly(false);
    setSortBy("newest");
    applyDatePreset("month");
    setGroupByDay(false);
    setPage(1);
  };

  const handleDelete = async (expense: Expense) => {
    if (window.confirm(`Delete transaction "${expense.note || "Transaction"}" (${displayAmount(expense.amount)})?`)) {
      try {
        await deleteExpense(expense.id);
        showToast("Transaction deleted", "success");
      } catch (error) {
        console.error("Error deleting transaction:", error);
        showToast("Failed to delete", "error");
      }
    }
  };

  const activeFilterCount =
    (categoryFilter !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (paymentFilter !== "all" ? 1 : 0) +
    (minAmount.trim() ? 1 : 0) +
    (maxAmount.trim() ? 1 : 0) +
    (receiptsOnly ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const historyFilterProps = {
    categories,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    typeFilter,
    setTypeFilter,
    paymentFilter,
    setPaymentFilter,
    minAmount,
    setMinAmount,
    maxAmount,
    setMaxAmount,
    receiptsOnly,
    setReceiptsOnly,
    sortBy,
    setSortBy,
    advancedOpen,
    setAdvancedOpen,
    groupByDay,
    setGroupByDay,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    datePreset,
    applyDatePreset,
    matchCount: filteredAndSorted.length,
    safePage,
    totalPages,
    pageSize,
    setPageSizePersisted,
    setPage,
    activeFilterCount,
    duplicateCandidates,
    displayAmount,
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in p-4 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">History</h1>
          <p className="hidden md:block text-muted-foreground mt-1 font-medium max-w-xl">
            Pro workspace: deep filters, day grouping, pagination, and category insights for the selected period.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={resetFilters}
            className="bg-accent/30 text-foreground p-2.5 md:px-4 md:py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-border hover:bg-accent transition-all inline-flex items-center gap-2"
            title="Reset filters"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            type="button"
            onClick={() => exportToCSV(filteredAndSorted)}
            disabled={filteredAndSorted.length === 0}
            className="bg-accent/30 text-foreground p-2.5 md:px-4 md:py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-border hover:bg-accent transition-all flex items-center gap-2 disabled:opacity-50"
            title="Export CSV"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            type="button"
            onClick={() => exportToPDF(filteredAndSorted)}
            disabled={filteredAndSorted.length === 0}
            className="bg-accent/30 text-foreground p-2.5 md:px-4 md:py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-border hover:bg-accent transition-all flex items-center gap-2 disabled:opacity-50"
            title="Export PDF"
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* KPI strip — first 3 tiles always; rest from tablet up (mobile: compact text + wrap) */}
      <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-6 gap-1.5 sm:gap-2 md:gap-3">
        {[
          { label: "Income", value: totalIncomeAmount, className: "text-success", prefix: "+" },
          { label: "Expenses", value: totalExpenseAmount, className: "text-foreground", prefix: "" },
          { label: "Net", value: Math.abs(netAmount), className: netAmount >= 0 ? "text-success" : "text-danger", prefix: netAmount >= 0 ? "+" : "−" },
          { label: "Transactions", value: filteredAndSorted.length, className: "text-foreground", prefix: "", format: "count" as const },
          { label: "Avg size", value: averageAmount, className: "text-foreground", prefix: "" },
          { label: "Expense / Income #", value: expenseCount, className: "text-muted-foreground", prefix: "", sub: `${expenseCount} exp · ${incomeCount} inc` },
        ].map((kpi, i) => (
          <div
            key={i}
            className={cn(
              "bg-card border border-border rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4 shadow-sm min-w-0",
              i >= 3 && "hidden md:block",
            )}
          >
            <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-muted-foreground truncate">
              {kpi.label}
            </p>
            {kpi.sub ? (
              <p className="text-xs sm:text-sm font-black text-foreground mt-0.5 sm:mt-1 leading-tight break-words">{kpi.sub}</p>
            ) : (
              <p
                className={cn(
                  "text-xs sm:text-lg md:text-xl font-black mt-0.5 sm:mt-1 tabular-nums leading-tight break-all hyphens-auto",
                  kpi.className,
                )}
              >
                {kpi.format === "count" ? (
                  kpi.value
                ) : (
                  <>
                    {kpi.prefix}
                    {displayAmount(typeof kpi.value === "number" ? kpi.value : 0)}
                  </>
                )}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: quick presets + filters (full list starts below with less scroll) */}
      <div className="md:hidden sticky top-0 z-30 -mx-4 px-4 py-2.5 bg-background/95 backdrop-blur-md border-b border-border/80 space-y-2.5 safe-top">
        <div className="flex gap-2 overflow-x-auto pb-1 overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]">
          {(
            [
              { id: "month" as const, label: "Month" },
              { id: "last7" as const, label: "7d" },
              { id: "last30" as const, label: "30d" },
              { id: "year" as const, label: "Year" },
              { id: "all" as const, label: "All" },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyDatePreset(preset.id)}
              className={cn(
                "shrink-0 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                datePreset === preset.id
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-accent/20 border-border text-muted-foreground",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileFilterSheetOpen(true)}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shrink-0",
              activeFilterCount > 0 ? "bg-primary/15 border-primary text-primary" : "bg-accent/20 border-border text-foreground",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            All filters
            {activeFilterCount > 0 && (
              <span className="min-w-[1.125rem] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <span className="text-[11px] font-semibold text-muted-foreground tabular-nums ml-auto text-right leading-snug max-w-[min(100%,9rem)]">
            {filteredAndSorted.length} matches · page {safePage}/{totalPages}
          </span>
          <label className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase shrink-0">
            Rows
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSizePersisted(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1.5 rounded-lg bg-accent/10 border border-border font-bold min-w-[3.5rem]"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      </div>

      <div className="hidden md:grid xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 bg-card border border-border rounded-3xl p-6 shadow-sm">
          <HistoryFiltersForm {...historyFilterProps} hideMatchRow={false} />
        </div>
        <HistoryInsightsColumn topExpenseCategories={topExpenseCategories} displayAmount={displayAmount} />
      </div>

      {isMobile &&
        mobileFilterSheetOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[58] flex flex-col bg-background pt-[env(safe-area-inset-top,0px)]">
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card">
              <h2 className="text-lg font-black text-foreground tracking-tight">Filters & insights</h2>
              <button
                type="button"
                aria-label="Close filters"
                onClick={closeMobileFilterSheet}
                className="p-2.5 rounded-xl hover:bg-accent text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-8 pb-10">
              <HistoryFiltersForm {...historyFilterProps} hideMatchRow />
              <HistoryInsightsColumn topExpenseCategories={topExpenseCategories} displayAmount={displayAmount} />
            </div>
          </div>,
          document.body,
        )}

      <div className="space-y-4">
        {paginated.length > 0 ? (
          <>
            {paginated.map((expense, i) => {
              const showDayHeader =
                groupByDay &&
                (i === 0 ||
                  format(parseISO(paginated[i - 1].date), "yyyy-MM-dd") !== format(parseISO(expense.date), "yyyy-MM-dd"));
              return (
                <div key={expense.id}>
                  {showDayHeader && (
                    <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 mt-6 first:mt-0 pl-1">
                      {format(parseISO(expense.date), "EEEE · d MMMM yyyy")}
                    </p>
                  )}
                  <ExpenseRow
                    expense={expense}
                    categories={categories}
                    cards={cards}
                    onDelete={() => handleDelete(expense)}
                    onEdit={() => showTransactionModal(expense)}
                    onOpen={() => showTransactionModal(expense)}
                    onPhotoClick={() => {
                      if (getExpenseReceiptUrls(expense).length > 0) setPhotoModalExpense(expense);
                    }}
                    formatAmount={displayAmount}
                  />
                </div>
              );
            })}

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card font-black text-xs uppercase tracking-widest disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                <span className="text-xs font-bold text-muted-foreground tabular-nums">
                  {pageStart + 1}–{Math.min(pageStart + pageSize, filteredAndSorted.length)} of {filteredAndSorted.length}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card font-black text-xs uppercase tracking-widest disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-[2.5rem] bg-card border border-border border-dashed p-16 sm:p-20 text-center space-y-3">
            <p className="text-muted-foreground font-black uppercase tracking-widest text-sm">No transactions match</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Widen the date range, clear search, or hit Reset to return to this month.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-primary font-black text-xs uppercase tracking-widest hover:underline"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {photoModalExpense &&
        getExpenseReceiptUrls(photoModalExpense).length > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          (() => {
            const receiptUrls = getExpenseReceiptUrls(photoModalExpense);
            const safeIndex = Math.min(receiptSlideIndex, Math.max(0, receiptUrls.length - 1));
            const currentSrc = receiptUrls[safeIndex];
            return (
              <div
                className={cn(
                  "fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-2 sm:p-6",
                  modalBackdropBlurClass(settings.modalBackdropBlur, settings.reducedMotion),
                )}
                onClick={closePhotoModal}
              >
                <div
                  className="w-full sm:max-w-6xl h-[calc(100dvh-1rem)] sm:h-[calc(100dvh-3rem)] bg-background border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 sm:p-5 border-b border-border bg-card flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Receipt Preview
                      </p>
                      <h3 className="text-sm sm:text-base font-black text-foreground truncate">
                        {photoModalExpense.note || photoModalExpense.merchant || "Expense"}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={closePhotoModal}
                      className="p-2 hover:bg-accent rounded-full transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] min-h-0 flex-1">
                    <div className="relative min-h-0 bg-black/50">
                      <img
                        src={currentSrc}
                        alt={`Receipt ${safeIndex + 1} of ${receiptUrls.length}`}
                        className="w-full h-full object-contain"
                      />
                      {receiptUrls.length > 1 && (
                        <>
                          <div className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full">
                            {safeIndex + 1} / {receiptUrls.length}
                          </div>
                          <button
                            type="button"
                            aria-label="Previous receipt image"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReceiptSlideIndex((i) => (i - 1 + receiptUrls.length) % receiptUrls.length);
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </button>
                          <button
                            type="button"
                            aria-label="Next receipt image"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReceiptSlideIndex((i) => (i + 1) % receiptUrls.length);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                          >
                            <ChevronRight className="h-6 w-6" />
                          </button>
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {receiptUrls.map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                aria-label={`Show receipt image ${i + 1}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReceiptSlideIndex(i);
                                }}
                                className={cn(
                                  "h-2 w-2 rounded-full transition-colors",
                                  i === safeIndex ? "bg-white" : "bg-white/40 hover:bg-white/70",
                                )}
                              />
                            ))}
                          </div>
                        </>
                      )}
                      <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1">
                        <Maximize2 className="h-3 w-3" />
                        Fit View
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 border-t lg:border-t-0 lg:border-l border-border bg-card overflow-y-auto space-y-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount</p>
                        <p
                          className={cn(
                            "text-2xl font-black",
                            photoModalExpense.type === "income" ? "text-success" : "text-foreground",
                          )}
                        >
                          {photoModalExpense.type === "income" ? "+" : "-"}
                          {displayAmount(photoModalExpense.amount)}
                        </p>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</p>
                          <p className="font-bold text-foreground">{format(parseISO(photoModalExpense.date), "dd MMM yyyy")}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</p>
                          <p className="font-bold text-foreground">
                            {categories.find((c) => c.id === photoModalExpense.categoryId)?.name ||
                              photoModalExpense.categoryId}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Description
                          </p>
                          <p className="font-bold text-foreground wrap-break-word">
                            {photoModalExpense.note || photoModalExpense.merchant || "N/A"}
                          </p>
                        </div>
                        {photoModalExpense.reference && (
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              Reference
                            </p>
                            <p className="font-bold text-foreground">{photoModalExpense.reference}</p>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-border grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            showTransactionModal(photoModalExpense);
                            closePhotoModal();
                          }}
                          className="py-3 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit Expense
                        </button>
                        <button
                          type="button"
                          onClick={closePhotoModal}
                          className="py-3 rounded-xl border border-border font-black text-xs uppercase tracking-widest hover:bg-accent transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })(),
          document.body,
        )}
    </div>
  );
}

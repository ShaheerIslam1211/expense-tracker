import { format, parseISO } from "date-fns";
import {
  Search,
  Filter,
  ArrowUpCircle,
  FileText,
  SlidersHorizontal,
  LayoutList,
  List,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  PieChart,
} from "lucide-react";
import type { Expense } from "../../types";
import { cn } from "../../utils/cn";

export type DatePresetId = "month" | "last7" | "last30" | "year" | "all" | "custom";
export type SortId = "newest" | "oldest" | "highest" | "lowest" | "category";

type CategoryLite = { id: string; icon: string; color: string; name: string };

export interface HistoryFiltersFormProps {
  categories: CategoryLite[];
  search: string;
  setSearch: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  paymentFilter: "all" | "cash" | "card";
  setPaymentFilter: (v: "all" | "cash" | "card") => void;
  minAmount: string;
  setMinAmount: (v: string) => void;
  maxAmount: string;
  setMaxAmount: (v: string) => void;
  receiptsOnly: boolean;
  setReceiptsOnly: (v: boolean) => void;
  sortBy: SortId;
  setSortBy: (v: SortId) => void;
  advancedOpen: boolean;
  setAdvancedOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  groupByDay: boolean;
  setGroupByDay: (v: boolean | ((g: boolean) => boolean)) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  datePreset: DatePresetId;
  applyDatePreset: (p: Exclude<DatePresetId, "custom">) => void;
  matchCount: number;
  safePage: number;
  totalPages: number;
  pageSize: number;
  setPageSizePersisted: (n: number) => void;
  setPage: (v: number | ((p: number) => number)) => void;
  activeFilterCount: number;
  duplicateCandidates: Expense[][];
  displayAmount: (n: number) => string;
  /** Hide the bottom "matches / per page" row (shown in mobile toolbar instead). */
  hideMatchRow?: boolean;
}

export function HistoryFiltersForm({
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
  matchCount,
  safePage,
  totalPages,
  pageSize,
  setPageSizePersisted,
  setPage,
  activeFilterCount,
  duplicateCandidates,
  displayAmount,
  hideMatchRow,
}: HistoryFiltersFormProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search note, amount, merchant, reference…"
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
              <option key={c.id} value={c.id}>
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

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all",
            advancedOpen ? "bg-primary/15 border-primary text-primary" : "bg-accent/20 border-border text-muted-foreground hover:bg-accent/40",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Advanced
          {activeFilterCount > 0 && (
            <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => setGroupByDay((g) => !g)}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all",
            groupByDay ? "bg-primary/15 border-primary text-primary" : "bg-accent/20 border-border text-muted-foreground hover:bg-accent/40",
          )}
        >
          {groupByDay ? <LayoutList className="h-4 w-4" /> : <List className="h-4 w-4" />}
          {groupByDay ? "Grouped by day" : "Flat list"}
        </button>

        <div className="relative flex-1 min-w-[160px] max-w-xs ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortId)}
            className="w-full px-4 py-2.5 bg-accent/10 border border-border rounded-xl font-bold appearance-none outline-none focus:border-primary transition-all text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest amount</option>
            <option value="lowest">Lowest amount</option>
            <option value="category">Category A–Z</option>
          </select>
        </div>
      </div>

      {advancedOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl border border-border bg-accent/5">
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">
              Payment
            </label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as "all" | "cash" | "card")}
              className="w-full px-3 py-2.5 bg-card border border-border rounded-xl font-bold text-sm"
            >
              <option value="all">Cash & Card</option>
              <option value="cash">Cash only</option>
              <option value="card">Card only</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Min amount</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full px-3 py-2.5 bg-card border border-border rounded-xl font-bold text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Max amount</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Any"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full px-3 py-2.5 bg-card border border-border rounded-xl font-bold text-sm"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer pt-6">
            <input
              type="checkbox"
              checked={receiptsOnly}
              onChange={(e) => setReceiptsOnly(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary"
            />
            <span className="text-sm font-bold text-foreground">Has receipt only</span>
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Start Date</label>
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
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">End Date</label>
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

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "month" as const, label: "This Month" },
            { id: "last7" as const, label: "Last 7 Days" },
            { id: "last30" as const, label: "Last 30 Days" },
            { id: "year" as const, label: "This Year" },
            { id: "all" as const, label: "All Time" },
          ] as const
        ).map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyDatePreset(preset.id)}
            className={cn(
              "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
              datePreset === preset.id
                ? "bg-primary/10 border-primary text-primary"
                : "bg-accent/20 border-border text-muted-foreground hover:bg-accent/40",
            )}
          >
            {preset.label}
          </button>
        ))}
        {datePreset === "custom" && (
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">Custom range</span>
        )}
      </div>

      {!hideMatchRow && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
            <FileText className="h-4 w-4" />
            <span>
              {matchCount} match{matchCount !== 1 ? "es" : ""}
              {matchCount > 0 && (
                <span className="text-foreground ml-1">
                  · Page {safePage}/{totalPages}
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Per page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSizePersisted(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-accent/10 border border-border font-bold text-xs"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}

      {duplicateCandidates.length > 0 && (
        <div className="border border-warning/30 bg-warning/10 rounded-2xl p-4">
          <p className="text-xs font-black uppercase tracking-widest text-warning mb-2">
            Possible duplicates ({duplicateCandidates.length} groups)
          </p>
          <div className="space-y-2">
            {duplicateCandidates.slice(0, 5).map((group, idx) => (
              <p key={idx} className="text-xs font-semibold text-foreground">
                {group.length}× on {format(parseISO(group[0].date), "dd MMM yyyy")} · {displayAmount(group[0].amount)} ·{" "}
                {group[0].merchant || group[0].note || "—"}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export interface TopCategoryRow {
  id: string;
  amount: number;
  name: string;
  color: string;
  pct: number;
}

export function HistoryInsightsColumn({
  topExpenseCategories,
  displayAmount,
}: {
  topExpenseCategories: TopCategoryRow[];
  displayAmount: (n: number) => string;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Top expense categories</h2>
        </div>
        {topExpenseCategories.length === 0 ? (
          <p className="text-xs text-muted-foreground font-medium">No expenses in this period.</p>
        ) : (
          <ul className="space-y-4">
            {topExpenseCategories.map((row) => (
              <li key={row.id}>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="truncate pr-2">{row.name}</span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">{displayAmount(row.amount)}</span>
                </div>
                <div className="h-2 rounded-full bg-accent/30 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-linear-to-br from-primary/10 to-transparent border border-primary/20 rounded-3xl p-5">
        <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">Tips</p>
        <ul className="text-xs text-muted-foreground space-y-2 font-medium leading-relaxed">
          <li>Tap any row to open the transaction editor.</li>
          <li>Use Advanced → amount range to audit large spends.</li>
          <li>Export CSV/PDF uses all matching results, not only the current page.</li>
        </ul>
      </div>
    </div>
  );
}

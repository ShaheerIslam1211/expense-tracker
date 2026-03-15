import { useState } from "react";
import { useExpenses } from "../context/ExpenseContext";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "../utils/cn";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "../hooks/useCurrency";
import type { Expense } from "../types";
import { useIsMobile } from "../hooks/useIsMobile";
import { useAppSettings } from "../context/AppSettingsContext";

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const { expenses } = useExpenses();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const isMobile = useIsMobile();
  const { settings } = useAppSettings();

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const weekStartsOn = settings.weekStartsOnMonday ? 1 : 0;
  const startDate = startOfWeek(monthStart, { weekStartsOn });
  const endDate = endOfWeek(monthEnd, { weekStartsOn });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const getExpensesForDay = (day: Date) => {
    return expenses.filter((expense: Expense) => isSameDay(new Date(expense.date), day));
  };

  const weekDays = settings.weekStartsOnMonday
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthExpenses = expenses.filter((e: Expense) => isSameMonth(new Date(e.date), currentMonth));
  const monthTotal = monthExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);
  const categoryTotals = monthExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.categoryId] = (acc[e.categoryId] || 0) + e.amount;
    return acc;
  }, {});
  const topCategoryId =
    Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/^\w/, (s) => s.toUpperCase()) || "N/A";

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Financial Calendar</h1>
          <p className="text-muted-foreground mt-1">Visualize your spending patterns daily.</p>
        </div>

        <div className="flex items-center bg-card border border-border rounded-xl p-1 shadow-sm w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <span className="px-2 sm:px-6 font-bold text-xs sm:text-sm min-w-[120px] sm:min-w-[140px] text-center text-foreground">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[720px] sm:min-w-0">
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-4 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider"
            >
              {isMobile ? day.charAt(0) : day}
            </div>
          ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-border">
          {calendarDays.map((day) => {
            const dayExpenses = getExpensesForDay(day);
            const totalForDay = dayExpenses.reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const dayKey = format(day, "yyyy-MM-dd");
            const previewCount = isMobile ? 1 : 2;
            const showDayDetails =
              dayExpenses.length > 0 &&
              ((isMobile && activeDay === dayKey) || (!isMobile && hoveredDay === dayKey));

            return (
              <div
                key={day.toString()}
                onMouseEnter={() => {
                  if (!isMobile && isCurrentMonth && dayExpenses.length > 0) setHoveredDay(dayKey);
                }}
                onMouseLeave={() => {
                  if (!isMobile) setHoveredDay((prev) => (prev === dayKey ? null : prev));
                }}
                onClick={() => {
                  if (!isMobile || !isCurrentMonth || dayExpenses.length === 0) return;
                  setActiveDay((prev) => (prev === dayKey ? null : dayKey));
                }}
                className={cn(
                  "relative h-[116px] sm:h-[130px] bg-card p-2 sm:p-3 transition-all duration-200 hover:bg-accent/30 group flex flex-col overflow-hidden",
                  isCurrentMonth && dayExpenses.length > 0 && "cursor-pointer",
                  showDayDetails && "ring-1 ring-primary/50 bg-accent/20",
                  !isCurrentMonth && "bg-muted/10 text-muted-foreground/50",
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={cn(
                      "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                      isToday(day)
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "text-foreground group-hover:bg-muted",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {isCurrentMonth && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/add?date=${format(day, "yyyy-MM-dd")}`);
                      }}
                      className={cn(
                        "p-1 rounded-md hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground",
                        isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                      )}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                  {dayExpenses.slice(0, previewCount).map((expense: Expense) => (
                    <div
                      key={expense.id}
                      className="text-[10px] px-2 py-1 rounded-md bg-accent/80 border border-border truncate font-medium text-foreground"
                    >
                      <span className="truncate">{expense.note || expense.merchant || "Expense"}</span>
                    </div>
                  ))}
                  {dayExpenses.length > previewCount && (
                    <div className="text-[10px] text-left text-primary font-bold py-0.5">
                      {isMobile ? "Tap to view all" : "Hover to view all"} (+{dayExpenses.length - previewCount})
                    </div>
                  )}
                </div>

                {totalForDay > 0 && (
                  <div className="mt-1 pt-1 border-t border-border/60">
                    <div className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10 w-fit ml-auto">
                      {formatAmount(totalForDay, { compact: true, symbol: true })}
                    </div>
                  </div>
                )}

                {showDayDetails && (
                  <div className="absolute inset-1 z-20 rounded-lg border border-primary/20 bg-background/95 backdrop-blur-md p-2 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-primary">
                        {format(day, "EEE, MMM d")}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground">{dayExpenses.length} entries</p>
                    </div>
                    <div className="space-y-1.5 max-h-[76px] sm:max-h-[88px] overflow-y-auto pr-1 no-scrollbar">
                      {dayExpenses.map((expense: Expense) => (
                        <div
                          key={`detail-${expense.id}`}
                          className="flex items-center justify-between gap-2 text-[10px] px-2 py-1 rounded-md bg-accent/30 border border-border/70"
                        >
                          <span className="truncate font-medium text-foreground">
                            {expense.note || expense.merchant || "Expense"}
                          </span>
                          <span className="font-black text-foreground shrink-0">{formatAmount(expense.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Month Total</p>
          <p className="text-3xl font-black text-foreground">
            {formatAmount(monthTotal)}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Daily Average</p>
          <p className="text-3xl font-black text-foreground">
            {formatAmount(monthTotal / 30)}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Top Category</p>
          <p className="text-3xl font-black text-foreground">{topCategoryId}</p>
        </div>
      </div>
    </div>
  );
}

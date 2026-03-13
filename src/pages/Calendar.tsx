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

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { expenses } = useExpenses();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const getExpensesForDay = (day: Date) => {
    return expenses.filter((expense: Expense) => isSameDay(new Date(expense.date), day));
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial Calendar</h1>
          <p className="text-muted-foreground mt-1">Visualize your spending patterns daily.</p>
        </div>

        <div className="flex items-center bg-card border border-border rounded-xl p-1.5 shadow-sm">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <span className="px-6 font-bold text-sm min-w-[140px] text-center text-foreground">
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
        <div className="grid grid-cols-7 border-b border-border bg-muted/30">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-4 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-border">
          {calendarDays.map((day) => {
            const dayExpenses = getExpensesForDay(day);
            const totalForDay = dayExpenses.reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
            const isCurrentMonth = isSameMonth(day, monthStart);

            return (
              <div
                key={day.toString()}
                className={cn(
                  "min-h-[120px] bg-card p-3 transition-all duration-200 hover:bg-accent/30 group relative",
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
                      onClick={() => navigate(`/add?date=${format(day, "yyyy-MM-dd")}`)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 mt-2">
                  {dayExpenses.slice(0, 2).map((expense: Expense) => (
                    <div
                      key={expense.id}
                      className="text-[10px] px-2 py-1 rounded-md bg-accent border border-border truncate font-medium flex items-center justify-between text-foreground"
                    >
                      <span className="truncate">{expense.note || expense.merchant || "Expense"}</span>
                      <span className="font-bold ml-1">{formatAmount(expense.amount)}</span>
                    </div>
                  ))}
                  {dayExpenses.length > 2 && (
                    <div className="text-[10px] text-center text-muted-foreground font-medium py-1">
                      +{dayExpenses.length - 2} more
                    </div>
                  )}
                </div>

                {totalForDay > 0 && (
                  <div className="absolute bottom-3 right-3">
                    <div className="text-[11px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                      {formatAmount(totalForDay, { compact: true, symbol: true })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Month Total</p>
          <p className="text-3xl font-black text-foreground">
            {formatAmount(
              expenses
                .filter((e: Expense) => isSameMonth(new Date(e.date), currentMonth))
                .reduce((sum: number, e: Expense) => sum + e.amount, 0),
            )}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Daily Average</p>
          <p className="text-3xl font-black text-foreground">
            {formatAmount(
              expenses
                .filter((e: Expense) => isSameMonth(new Date(e.date), currentMonth))
                .reduce((sum: number, e: Expense) => sum + e.amount, 0) / 30,
            )}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Top Category</p>
          <p className="text-3xl font-black text-foreground">Food</p>
        </div>
      </div>
    </div>
  );
}

import { endOfMonth, parseISO } from "date-fns";
import type { Expense } from "../types";

export function compareExpenseChronological(a: Expense, b: Expense): number {
  const da = parseISO(a.date).getTime();
  const db = parseISO(b.date).getTime();
  if (da !== db) return da - db;
  return (a.createdAt || "").localeCompare(b.createdAt || "");
}

/**
 * Same calendar month: dad reimbursements reduce budget-relevant spend by up to that month's
 * Dad-category expenses (so a payback in March offsets March dad spend, not other categories).
 */
export function dadBudgetOffsetForMonth(expenses: Expense[], year: number, month: number): number {
  let dadSpend = 0;
  let recovery = 0;
  for (const e of expenses) {
    const d = parseISO(e.date);
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month) continue;
    if (e.type === "expense" && e.categoryId === "dad") dadSpend += e.amount;
    if (e.type === "income" && e.dadRecovery) recovery += e.amount;
  }
  return Math.min(dadSpend, recovery);
}

/** Total expense outflow in month (all categories). */
export function rawTotalSpentInMonth(expenses: Expense[], year: number, month: number): number {
  return expenses
    .filter((e) => e.type === "expense")
    .filter((e) => {
      const d = parseISO(e.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    })
    .reduce((s, e) => s + e.amount, 0);
}

/**
 * Spend counted against monthly budget: same-month Dad expenses minus same-month dad payback
 * (capped so payback does not reduce non-dad spend).
 */
export function totalSpentForBudget(expenses: Expense[], year: number, month: number): number {
  const raw = rawTotalSpentInMonth(expenses, year, month);
  const offset = dadBudgetOffsetForMonth(expenses, year, month);
  return Math.max(0, raw - offset);
}

/**
 * After all transactions through end of month: unreimbursed dad-fronted total.
 * Recoveries pay down oldest Dad expenses first (FIFO).
 */
export function dadOutstandingThroughMonthEnd(expenses: Expense[], year: number, month: number): number {
  const end = endOfMonth(new Date(year, month - 1));
  const endTime = end.getTime();
  const sorted = [...expenses].sort(compareExpenseChronological);
  const queue: number[] = [];
  for (const e of sorted) {
    const d = parseISO(e.date);
    if (d.getTime() > endTime) break;
    if (e.type === "expense" && e.categoryId === "dad") queue.push(e.amount);
    else if (e.type === "income" && e.dadRecovery) {
      let r = e.amount;
      while (r > 0 && queue.length) {
        const head = queue[0];
        const take = Math.min(head, r);
        queue[0] = head - take;
        r -= take;
        if (queue[0] === 0) queue.shift();
      }
    }
  }
  return queue.reduce((s, x) => s + x, 0);
}

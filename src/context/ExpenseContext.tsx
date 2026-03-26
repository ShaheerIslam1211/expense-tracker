import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  format,
} from "date-fns";
import type { Expense, CategoryId, MonthlySummary, RecurringInfo } from "../types";
import { db } from "../firebase";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "./AuthContext";

interface ExpenseContextValue {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  getExpensesByMonth: (year: number, month: number) => Expense[];
  getMonthlySummaries: (year: number) => MonthlySummary[];
  getCategoryTotal: (year: number, month: number, categoryId: CategoryId) => number;
  getFuelExpenses: (year?: number, month?: number) => Expense[];
  totalSpent: (year?: number, month?: number) => number;
  totalIncome: (year?: number, month?: number) => number;
  getBalances: () => { cash: number; cards: Record<string, number> };
}

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

const RECURRING_PROCESS_MAX_STEPS = 500;

function recurringInstanceDocId(templateId: string, occurrenceIso: string): string {
  const safeOcc = occurrenceIso.replace(/[^a-zA-Z0-9]/g, "_");
  const raw = `r_${templateId}_${safeOcc}`;
  return raw.length <= 1200 ? raw : raw.slice(0, 1200);
}

function generateExpenseReference(): string {
  const timePart = Date.now().toString().slice(-4);
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `Ref-${timePart}${randomPart}`;
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, stripUndefinedDeep(v)]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const recurringChainRef = useRef(Promise.resolve());

  const processRecurringTransactions = useCallback(
    async (currentExpenses: Expense[]) => {
      if (!user) return;
      const uid = user.uid;
      const now = new Date();

      for (const template of currentExpenses) {
        const rec = template.recurring;
        if (!rec?.isRecurring || !rec.nextOccurrenceDate) continue;

        let expense = template;
        let nextDate = parseISO(rec.nextOccurrenceDate);
        let steps = 0;

        while (
          (isBefore(nextDate, now) || format(nextDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")) &&
          steps < RECURRING_PROCESS_MAX_STEPS
        ) {
          steps += 1;
          const recurringInfo = expense.recurring;
          if (!recurringInfo?.nextOccurrenceDate) break;

          const occurrenceDateStr = recurringInfo.nextOccurrenceDate;
          const newId = recurringInstanceDocId(expense.id, occurrenceDateStr);

          const { recurring: _rec, ...baseExpense } = expense;
          void _rec;

          const newExpense: Expense = {
            ...baseExpense,
            id: newId,
            date: occurrenceDateStr,
            createdAt: new Date().toISOString(),
          };

          await setDoc(doc(db, "users", uid, "expenses", newId), stripUndefinedDeep(newExpense));

          let updatedNextDate: Date;
          switch (recurringInfo.frequency) {
            case "daily":
              updatedNextDate = addDays(nextDate, 1);
              break;
            case "weekly":
              updatedNextDate = addWeeks(nextDate, 1);
              break;
            case "monthly":
              updatedNextDate = addMonths(nextDate, 1);
              break;
            case "yearly":
              updatedNextDate = addYears(nextDate, 1);
              break;
            default:
              updatedNextDate = addMonths(nextDate, 1);
          }

          const nextOccurrenceStr = updatedNextDate.toISOString();
          await updateDoc(doc(db, "users", uid, "expenses", expense.id), {
            "recurring.nextOccurrenceDate": nextOccurrenceStr,
            "recurring.lastProcessedDate": new Date().toISOString(),
          });

          const prevRecurring = expense.recurring;
          if (!prevRecurring) break;

          const nextRecurring: RecurringInfo = {
            ...prevRecurring,
            nextOccurrenceDate: nextOccurrenceStr,
          };
          expense = {
            ...expense,
            recurring: nextRecurring,
          };
          nextDate = updatedNextDate;

          if (nextRecurring.endDate && isBefore(parseISO(nextRecurring.endDate), nextDate)) {
            break;
          }
        }
      }
    },
    [user],
  );

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "users", user.uid, "expenses"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const next: Expense[] = snap.docs.map((d) => {
        const data = d.data() as Partial<Expense>;
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d.id);
        const expenseId = isUUID ? d.id : data.id || d.id;

        return {
          ...data,
          id: expenseId,
          type: data.type || "expense",
        } as Expense;
      });
      setExpenses(next);

      recurringChainRef.current = recurringChainRef.current
        .then(() => processRecurringTransactions(next))
        .catch((err) => console.error("Recurring processing failed:", err));
    });

    return () => {
      unsub();
      recurringChainRef.current = Promise.resolve();
    };
  }, [user, processRecurringTransactions]);

  const addExpense = useCallback(
    async (expense: Omit<Expense, "id" | "createdAt">) => {
      if (!user) return;
      const expenseId = uuidv4();
      const reference =
        expense.type === "expense" && !expense.reference?.trim() ? generateExpenseReference() : expense.reference;
      const newExpense: Expense = {
        ...expense,
        reference,
        id: expenseId,
        createdAt: new Date().toISOString(),
      };
      const clean = stripUndefinedDeep(newExpense);
      try {
        await setDoc(doc(db, "users", user.uid, "expenses", expenseId), clean);
      } catch (error) {
        console.error("Failed to add expense:", error);
        throw error;
      }
    },
    [user],
  );

  const updateExpense = useCallback(
    async (id: string, updates: Partial<Expense>) => {
      if (!user) return;

      const ref = doc(db, "users", user.uid, "expenses", id);
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined) clean[k] = deleteField();
        else clean[k] = stripUndefinedDeep(v);
      }

      try {
        await updateDoc(ref, clean);
      } catch (error) {
        console.error("Failed to update expense:", error);
        throw error;
      }
    },
    [user],
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      if (!user) return;
      const ref = doc(db, "users", user.uid, "expenses", id);
      try {
        await deleteDoc(ref);
      } catch (error) {
        console.error("Failed to delete expense:", error);
        throw error;
      }
    },
    [user],
  );

  const getExpensesByMonth = useCallback(
    (year: number, month: number) => {
      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(start);
      return expenses.filter((e) => {
        const d = parseISO(e.date);
        return isWithinInterval(d, { start, end });
      });
    },
    [expenses],
  );

  const getMonthlySummaries = useCallback(
    (year: number): MonthlySummary[] => {
      const summaries: MonthlySummary[] = [];
      for (let month = 1; month <= 12; month++) {
        const monthExpenses = getExpensesByMonth(year, month);
        if (monthExpenses.length === 0) continue;

        const byCategory: Record<string, number> = {};
        let fuelTotal = 0;
        let cashTotal = 0;
        let cardTotal = 0;
        let total = 0;

        monthExpenses.forEach((e) => {
          const amount = e.type === "income" ? e.amount : -e.amount;
          total += amount;

          if (e.type === "expense") {
            byCategory[e.categoryId] = (byCategory[e.categoryId] || 0) + e.amount;
            if (e.categoryId === "fuel") fuelTotal += e.amount;
            if (e.paymentMethodType === "cash") cashTotal += e.amount;
            else cardTotal += e.amount;
          } else {
            if (e.paymentMethodType === "cash") cashTotal += e.amount;
            else cardTotal += e.amount;
          }
        });

        summaries.push({
          year,
          month,
          total,
          byCategory,
          expenseCount: monthExpenses.filter((e) => e.type === "expense").length,
          fuelTotal: fuelTotal || undefined,
          cashTotal,
          cardTotal,
        });
      }
      return summaries;
    },
    [getExpensesByMonth],
  );

  const getCategoryTotal = useCallback(
    (year: number, month: number, categoryId: CategoryId) => {
      return getExpensesByMonth(year, month)
        .filter((e) => e.categoryId === categoryId && e.type === "expense")
        .reduce((s, e) => s + e.amount, 0);
    },
    [getExpensesByMonth],
  );

  const getFuelExpenses = useCallback(
    (year?: number, month?: number) => {
      let list = expenses.filter((e) => e.categoryId === "fuel" && e.type === "expense");
      if (year != null) {
        list = list.filter((e) => {
          const d = parseISO(e.date);
          return d.getFullYear() === year;
        });
        if (month != null) {
          list = list.filter((e) => parseISO(e.date).getMonth() + 1 === month);
        }
      }
      return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    [expenses],
  );

  const totalSpent = useCallback(
    (year?: number, month?: number) => {
      let list = expenses.filter((e) => e.type === "expense");
      if (year != null) {
        list = list.filter((e) => parseISO(e.date).getFullYear() === year);
        if (month != null) {
          list = list.filter((e) => parseISO(e.date).getMonth() + 1 === month);
        }
      }
      return list.reduce((s, e) => s + e.amount, 0);
    },
    [expenses],
  );

  const totalIncome = useCallback(
    (year?: number, month?: number) => {
      let list = expenses.filter((e) => e.type === "income");
      if (year != null) {
        list = list.filter((e) => parseISO(e.date).getFullYear() === year);
        if (month != null) {
          list = list.filter((e) => parseISO(e.date).getMonth() + 1 === month);
        }
      }
      return list.reduce((s, e) => s + e.amount, 0);
    },
    [expenses],
  );

  const getBalances = useCallback(() => {
    let cash = 0;
    const cards: Record<string, number> = {};

    expenses.forEach((e) => {
      const amount = e.type === "income" ? e.amount : -e.amount;
      if (e.paymentMethodType === "cash") {
        cash += amount;
      } else if (e.paymentMethodId) {
        cards[e.paymentMethodId] = (cards[e.paymentMethodId] || 0) + amount;
      }
    });

    return { cash, cards };
  }, [expenses]);

  const value: ExpenseContextValue = useMemo(
    () => ({
      expenses,
      addExpense,
      updateExpense,
      deleteExpense,
      getExpensesByMonth,
      getMonthlySummaries,
      getCategoryTotal,
      getFuelExpenses,
      totalSpent,
      totalIncome,
      getBalances,
    }),
    [
      expenses,
      addExpense,
      updateExpense,
      deleteExpense,
      getExpensesByMonth,
      getMonthlySummaries,
      getCategoryTotal,
      getFuelExpenses,
      totalSpent,
      totalIncome,
      getBalances,
    ],
  );

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
}

/** Remounts expense state when the signed-in user changes so data never leaks across accounts. */
export function ExpenseProviderGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <ExpenseProvider key={user?.uid ?? "__signed_out__"}>{children}</ExpenseProvider>;
}

export function useExpenses() {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error("useExpenses must be used within ExpenseProvider");
  return ctx;
}

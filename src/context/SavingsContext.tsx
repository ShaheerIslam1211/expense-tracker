import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  increment,
  runTransaction,
  type UpdateData,
} from "firebase/firestore";
import { format } from "date-fns";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";
import { useExpenses } from "./ExpenseContext";
import type { SavingsGoal } from "../types";

interface SavingsContextValue {
  savingsGoals: SavingsGoal[];
  addSavingsGoal: (goal: Omit<SavingsGoal, "id" | "currentAmount">) => Promise<void>;
  updateSavingsGoal: (id: string, updates: UpdateData<SavingsGoal>) => Promise<void>;
  /**
   * Adds amount to goal saved total (always cumulative). Optionally logs an expense so it counts
   * in monthly spending vs income. Appends to recentDeposits for history.
   */
  recordSavingsContribution: (
    id: string,
    amount?: number,
    options?: { logAsExpense?: boolean },
  ) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  loading: boolean;
}

const SavingsContext = createContext<SavingsContextValue | null>(null);

const MAX_RECENT_DEPOSITS = 40;

export function SavingsProvider({ children }: { children: ReactNode }) {
  const { user, userData } = useAuth();
  const { addExpense } = useExpenses();
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSavingsGoals([]);
      setLoading(false);
      return;
    }

    const savingsCollection = collection(db, "users", user.uid, "savings");
    const unsubscribe = onSnapshot(savingsCollection, (snapshot) => {
      const goals = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SavingsGoal);
      setSavingsGoals(goals);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addSavingsGoal = async (goal: Omit<SavingsGoal, "id" | "currentAmount">) => {
    if (!user) return;
    const savingsCollection = collection(db, "users", user.uid, "savings");
    const payload = { ...goal, currentAmount: 0 };
    const cleaned = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined),
    );
    await addDoc(savingsCollection, cleaned);
  };

  const updateSavingsGoal = async (id: string, updates: UpdateData<SavingsGoal>) => {
    if (!user) return;
    const goalDoc = doc(db, "users", user.uid, "savings", id);
    const cleaned = Object.fromEntries(
      Object.entries(updates as Record<string, unknown>).filter(([, v]) => v !== undefined),
    );
    await updateDoc(goalDoc, cleaned as UpdateData<SavingsGoal>);
  };

  const recordSavingsContribution = useCallback(
    async (id: string, amount?: number, options?: { logAsExpense?: boolean }) => {
      if (!user) throw new Error("Not signed in");

      const goal = savingsGoals.find((g) => g.id === id);
      const add = amount ?? goal?.monthlyContribution;
      if (add === undefined || !Number.isFinite(add) || add <= 0) {
        throw new Error("Set a monthly saving amount on the goal, or enter a custom amount.");
      }

      const addInt = Math.floor(add);
      const goalDoc = doc(db, "users", user.uid, "savings", id);
      const ym = format(new Date(), "yyyy-MM");
      const logAsExpense =
        options?.logAsExpense !== undefined ? options.logAsExpense : goal?.logDepositAsExpense !== false;
      const goalName = goal?.name ?? "Savings goal";

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(goalDoc);
        if (!snap.exists()) {
          throw new Error("Goal not found");
        }
        const data = snap.data() as Partial<SavingsGoal>;
        const prevLog = Array.isArray(data.recentDeposits) ? data.recentDeposits : [];
        const entry = { at: new Date().toISOString(), amount: addInt };
        const recentDeposits = [...prevLog, entry].slice(-MAX_RECENT_DEPOSITS);
        transaction.update(goalDoc, {
          currentAmount: increment(addInt),
          lastContributionMonth: ym,
          recentDeposits,
        });
      });

      if (logAsExpense) {
        try {
          await addExpense({
            type: "expense",
            amount: addInt,
            currency: (userData?.currency as string) || "PKR",
            categoryId: "savings",
            note: `Savings: ${goalName}`,
            date: new Date().toISOString(),
            paymentMethodType: "cash",
            savingsGoalId: id,
            savingsDeposit: true,
            reference: `savings-goal:${id}`,
          });
        } catch (err) {
          console.error("Savings deposit expense log failed:", err);
          throw new Error(
            "Your goal balance was updated, but logging the expense failed. Add an expense manually if you want this to count in your monthly budget.",
          );
        }
      }
    },
    [user, userData?.currency, savingsGoals, addExpense],
  );

  const deleteSavingsGoal = async (id: string) => {
    if (!user) return;
    const goalDoc = doc(db, "users", user.uid, "savings", id);
    await deleteDoc(goalDoc);
  };

  return (
    <SavingsContext.Provider
      value={{
        savingsGoals,
        addSavingsGoal,
        updateSavingsGoal,
        recordSavingsContribution,
        deleteSavingsGoal,
        loading,
      }}
    >
      {children}
    </SavingsContext.Provider>
  );
}

export function useSavings() {
  const context = useContext(SavingsContext);
  if (!context) {
    throw new Error("useSavings must be used within a SavingsProvider");
  }
  return context;
}

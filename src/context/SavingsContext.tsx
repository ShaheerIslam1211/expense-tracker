import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  increment,
  runTransaction,
  deleteField,
  type UpdateData,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";
import { useExpenses } from "./ExpenseContext";
import type { SavingsDepositSource, SavingsDepositEntry, SavingsGoal } from "../types";
import {
  lastContributionMonthFromDeposits,
  materializeSavingsDepositIds,
  parseSavingsDeposits,
} from "../utils/savingsDeposits";

export type RecordSavingsContributionOptions = {
  logAsExpense?: boolean;
  depositedAt?: Date;
  note?: string;
  source?: SavingsDepositSource;
};

export type UpdateSavingsDepositPatch = {
  amount?: number;
  at?: string;
  note?: string | null;
  source?: SavingsDepositSource | null;
};

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
    options?: RecordSavingsContributionOptions,
  ) => Promise<void>;
  updateSavingsDeposit: (goalId: string, depositId: string, patch: UpdateSavingsDepositPatch) => Promise<void>;
  removeSavingsDeposit: (goalId: string, depositId: string) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  loading: boolean;
}

const SavingsContext = createContext<SavingsContextValue | null>(null);

const MAX_RECENT_DEPOSITS = 40;

export function SavingsProvider({ children }: { children: ReactNode }) {
  const { user, userData } = useAuth();
  const { addExpense, updateExpense, deleteExpense } = useExpenses();
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
    async (id: string, amount?: number, options?: RecordSavingsContributionOptions) => {
      if (!user) throw new Error("Not signed in");

      const goal = savingsGoals.find((g) => g.id === id);
      const add = amount ?? goal?.monthlyContribution;
      if (add === undefined || !Number.isFinite(add) || add <= 0) {
        throw new Error("Set a monthly saving amount on the goal, or enter a custom amount.");
      }

      const addInt = Math.floor(add);
      const goalDoc = doc(db, "users", user.uid, "savings", id);
      const logAsExpense =
        options?.logAsExpense !== undefined ? options.logAsExpense : goal?.logDepositAsExpense !== false;
      const goalName = goal?.name ?? "Savings goal";
      const depositId = uuidv4();
      const atIso = (options?.depositedAt ?? new Date()).toISOString();
      const noteTrim = options?.note?.trim();
      const source = options?.source;

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(goalDoc);
        if (!snap.exists()) {
          throw new Error("Goal not found");
        }
        const data = snap.data() as Partial<SavingsGoal>;
        const prevLog = materializeSavingsDepositIds(parseSavingsDeposits(data.recentDeposits));
        const entry: SavingsDepositEntry = {
          id: depositId,
          at: atIso,
          amount: addInt,
          ...(noteTrim ? { note: noteTrim } : {}),
          ...(source ? { source } : {}),
        };
        const recentDeposits = [...prevLog, entry].slice(-MAX_RECENT_DEPOSITS);
        const lastContributionMonth = lastContributionMonthFromDeposits(recentDeposits);
        transaction.update(goalDoc, {
          currentAmount: increment(addInt),
          lastContributionMonth,
          recentDeposits,
        });
      });

      if (logAsExpense) {
        const expenseId = uuidv4();
        const expenseNote = noteTrim ? `Savings: ${goalName} — ${noteTrim}` : `Savings: ${goalName}`;
        try {
          await addExpense(
            {
              type: "expense",
              amount: addInt,
              currency: (userData?.currency as string) || "PKR",
              categoryId: "savings",
              note: expenseNote,
              date: atIso,
              paymentMethodType: "cash",
              savingsGoalId: id,
              savingsDeposit: true,
              savingsDepositId: depositId,
              reference: `savings-deposit:${depositId}`,
            },
            { presetExpenseId: expenseId },
          );
          const snap = await getDoc(goalDoc);
          if (snap.exists()) {
            const data = snap.data() as Partial<SavingsGoal>;
            const list = parseSavingsDeposits(data.recentDeposits);
            const idx = list.findIndex((d) => d.id === depositId);
            if (idx >= 0) {
              const next = [...list];
              next[idx] = { ...next[idx], expenseId };
              await updateDoc(goalDoc, { recentDeposits: materializeSavingsDepositIds(next) });
            }
          }
        } catch (err) {
          console.error("Savings deposit expense log failed:", err);
          throw new Error(
            "Your goal balance was updated, but logging the expense failed. Add an expense manually if you want this to count in your monthly budget.",
          );
        }
      }
    },
    [user, userData, savingsGoals, addExpense],
  );

  const updateSavingsDeposit = useCallback(
    async (goalId: string, depositId: string, patch: UpdateSavingsDepositPatch) => {
      if (!user) throw new Error("Not signed in");
      const goalDoc = doc(db, "users", user.uid, "savings", goalId);
      const snap = await getDoc(goalDoc);
      if (!snap.exists()) throw new Error("Goal not found");
      const data = snap.data() as Partial<SavingsGoal>;
      const goalName = String(data.name ?? "Savings goal");

      let list = parseSavingsDeposits(data.recentDeposits);
      const idx = list.findIndex((d) => d.id === depositId);
      if (idx < 0) throw new Error("Deposit not found");

      const prev = list[idx];
      const newAmount = patch.amount !== undefined ? Math.floor(patch.amount) : prev.amount;
      const newAt = patch.at !== undefined ? patch.at : prev.at;
      if (!Number.isFinite(newAmount) || newAmount <= 0) {
        throw new Error("Amount must be greater than zero.");
      }
      const delta = newAmount - prev.amount;

      let note = prev.note;
      if (patch.note !== undefined) {
        const t = patch.note?.trim();
        note = t ? t : undefined;
      }
      let source = prev.source;
      if (patch.source !== undefined) {
        source = patch.source === null ? undefined : patch.source;
      }

      const nextEntry: SavingsDepositEntry = {
        id: prev.id,
        at: newAt,
        amount: newAmount,
      };
      if (prev.expenseId) nextEntry.expenseId = prev.expenseId;
      if (note) nextEntry.note = note;
      if (source) nextEntry.source = source;
      list[idx] = nextEntry;

      list = materializeSavingsDepositIds(list);
      const lastYm = lastContributionMonthFromDeposits(list);

      await updateDoc(goalDoc, {
        currentAmount: increment(delta),
        recentDeposits: list,
        lastContributionMonth: lastYm ?? deleteField(),
      });

      if (prev.expenseId) {
        const expenseNote = note ? `Savings: ${goalName} — ${note}` : `Savings: ${goalName}`;
        await updateExpense(prev.expenseId, {
          amount: newAmount,
          date: newAt,
          note: expenseNote,
        });
      }
    },
    [user, updateExpense],
  );

  const removeSavingsDeposit = useCallback(
    async (goalId: string, depositId: string) => {
      if (!user) throw new Error("Not signed in");
      const goalDoc = doc(db, "users", user.uid, "savings", goalId);
      const snap = await getDoc(goalDoc);
      if (!snap.exists()) throw new Error("Goal not found");
      const data = snap.data() as Partial<SavingsGoal>;

      const parsed = parseSavingsDeposits(data.recentDeposits);
      const idx = parsed.findIndex((d) => d.id === depositId);
      if (idx < 0) throw new Error("Deposit not found");
      const removed = parsed[idx];
      const list = materializeSavingsDepositIds(parsed.filter((_, i) => i !== idx));
      const lastYm = lastContributionMonthFromDeposits(list);

      await updateDoc(goalDoc, {
        currentAmount: increment(-removed.amount),
        recentDeposits: list,
        lastContributionMonth: lastYm ?? deleteField(),
      });

      if (removed.expenseId) {
        await deleteExpense(removed.expenseId);
      }
    },
    [user, deleteExpense],
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
        updateSavingsDeposit,
        removeSavingsDeposit,
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

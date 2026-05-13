import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { DEFAULT_MONTHLY_BUDGET } from "../constants/budget";

const BUDGET_STORAGE_KEY = "expense-tracker-budget";

function loadBudgetFromLocal(): number {
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
    if (raw == null) return DEFAULT_MONTHLY_BUDGET;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_MONTHLY_BUDGET;
  } catch {
    return DEFAULT_MONTHLY_BUDGET;
  }
}

function mirrorBudgetToLocal(value: number) {
  try {
    localStorage.setItem(BUDGET_STORAGE_KEY, String(value));
  } catch {
    // ignore
  }
}

interface BudgetContextValue {
  monthlyBudget: number;
  setMonthlyBudget: (value: number) => Promise<void>;
  overBy: (year: number, month: number, totalSpent: number) => number;
  remaining: (year: number, month: number, totalSpent: number) => number;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

function BudgetProviderInner({ children }: { children: ReactNode }) {
  const { user, userData, updateUserProfile } = useAuth();
  const [monthlyBudget, setMonthlyBudgetState] = useState(() => loadBudgetFromLocal());
  const cloudHydratedForUid = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      cloudHydratedForUid.current = null;
      return;
    }

    if (!userData) return;

    const fromCloud = userData.monthlyBudget;
    if (typeof fromCloud === "number" && Number.isFinite(fromCloud) && fromCloud > 0) {
      queueMicrotask(() => {
        setMonthlyBudgetState(fromCloud);
        mirrorBudgetToLocal(fromCloud);
      });
      cloudHydratedForUid.current = user.uid;
      return;
    }

    if (cloudHydratedForUid.current === user.uid) return;
    cloudHydratedForUid.current = user.uid;

    const local = loadBudgetFromLocal();
    queueMicrotask(() => setMonthlyBudgetState(local));
    void updateUserProfile({ monthlyBudget: local });
  }, [user, userData, updateUserProfile]);

  const setMonthlyBudget = useCallback(
    async (value: number) => {
      const safe = Math.max(0, Math.round(value));
      setMonthlyBudgetState(safe);
      mirrorBudgetToLocal(safe);
      if (user) {
        try {
          await updateUserProfile({ monthlyBudget: safe });
        } catch (e) {
          console.error("Failed to sync monthly budget:", e);
        }
      }
    },
    [user, updateUserProfile],
  );

  const remaining = useCallback(
    (_year: number, _month: number, totalSpent: number) => {
      return monthlyBudget - totalSpent;
    },
    [monthlyBudget],
  );

  const overBy = useCallback(
    (_year: number, _month: number, totalSpent: number) => {
      const rem = monthlyBudget - totalSpent;
      return rem < 0 ? Math.abs(rem) : 0;
    },
    [monthlyBudget],
  );

  const value = useMemo(
    () => ({
      monthlyBudget,
      setMonthlyBudget,
      overBy,
      remaining,
    }),
    [monthlyBudget, setMonthlyBudget, overBy, remaining],
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

/** Resets budget state when the signed-in user changes (avoids leaking values across accounts). */
export function BudgetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <BudgetProviderInner key={user?.uid ?? "__signed_out__"}>{children}</BudgetProviderInner>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error("useBudget must be used within BudgetProvider");
  return ctx;
}

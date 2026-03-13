import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";
import type { SavingsGoal } from "../types";

interface SavingsContextValue {
  savingsGoals: SavingsGoal[];
  addSavingsGoal: (goal: Omit<SavingsGoal, "id" | "currentAmount">) => Promise<void>;
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  loading: boolean;
}

const SavingsContext = createContext<SavingsContextValue | null>(null);

export function SavingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
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
    await addDoc(savingsCollection, { ...goal, currentAmount: 0 });
  };

  const updateSavingsGoal = async (id: string, updates: Partial<SavingsGoal>) => {
    if (!user) return;
    const goalDoc = doc(db, "users", user.uid, "savings", id);
    await updateDoc(goalDoc, updates);
  };

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

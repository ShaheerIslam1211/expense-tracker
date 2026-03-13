import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Card } from "../types";
import { db } from "../firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useAuth } from "./AuthContext";

interface CardContextValue {
  cards: Card[];
  addCard: (card: Omit<Card, "id">) => Promise<void>;
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  getCardById: (id: string) => Card | undefined;
}

const CardContext = createContext<CardContextValue | null>(null);

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

export function CardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    if (!user) {
      setCards([]);
      return;
    }
    const q = query(collection(db, "users", user.uid, "cards"));
    const unsub = onSnapshot(q, (snap) => {
      const next: Card[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<Card, "id">),
        id: d.id,
      }));
      setCards(next);
    });
    return () => unsub();
  }, [user]);

  const addCard = useCallback(
    async (card: Omit<Card, "id">) => {
      if (!user) return;
      const id = uuidv4();
      const newCard: Card = {
        ...card,
        id,
      };
      await setDoc(doc(db, "users", user.uid, "cards", id), stripUndefinedDeep(newCard));
    },
    [user],
  );

  const updateCard = useCallback(
    async (id: string, updates: Partial<Card>) => {
      if (!user) return;
      const safeUpdates = stripUndefinedDeep(updates);
      const ref = doc(db, "users", user.uid, "cards", id);
      try {
        await updateDoc(ref, safeUpdates);
      } catch (error) {
        // Legacy records may have mismatched "id" field vs document id.
        const legacyQuery = query(collection(db, "users", user.uid, "cards"), where("id", "==", id), limit(1));
        const legacySnap = await getDocs(legacyQuery);

        if (!legacySnap.empty) {
          await updateDoc(legacySnap.docs[0].ref, safeUpdates);
          return;
        }

        // Fallback to upsert so edits don't fail hard for users.
        await setDoc(ref, { id, ...safeUpdates }, { merge: true });
        console.warn("Card document missing during update; created/merged fallback doc.", error);
      }
    },
    [user],
  );

  const deleteCard = useCallback(
    async (id: string) => {
      if (!user) return;
      const ref = doc(db, "users", user.uid, "cards", id);
      await deleteDoc(ref);
    },
    [user],
  );

  const getCardById = useCallback((id: string) => cards.find((c) => c.id === id), [cards]);

  return (
    <CardContext.Provider value={{ cards, addCard, updateCard, deleteCard, getCardById }}>
      {children}
    </CardContext.Provider>
  );
}

export function useCards() {
  const context = useContext(CardContext);
  if (!context) {
    throw new Error("useCards must be used within a CardProvider");
  }
  return context;
}

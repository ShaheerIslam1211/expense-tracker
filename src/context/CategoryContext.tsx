import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import type { Category } from "../types";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";
import {
  isLegacyShadowCategoryId,
  normalizeCategoryId,
  RESERVED_CATEGORY_DOC_IDS,
} from "../utils/categoryNormalization";
import {
  restoreMissingDefaultCategories as restoreMissingDefaultCategoriesApi,
  syncCategoryDefaults,
} from "../utils/syncCategoryDefaults";

export type CategoryUpdatePayload = Partial<
  Pick<Category, "name" | "icon" | "color" | "forIncome" | "forExpense" | "sortOrder">
>;

interface CategoryContextValue {
  categories: Category[];
  customCategories: Category[];
  addCategory: (input: Pick<Category, "name" | "icon" | "color">) => Promise<string>;
  updateCategory: (id: string, updates: CategoryUpdatePayload) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  restoreMissingDefaultCategories: () => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  isSystemCategory: (id: string) => boolean;
}

const CategoryContext = createContext<CategoryContextValue | null>(null);

function mapCategoryDoc(id: string, data: Record<string, unknown>): Category {
  const forIncome = data.forIncome === true;
  const forExpense = data.forExpense !== false;
  return {
    id,
    name: typeof data.name === "string" ? data.name : "Category",
    icon: typeof data.icon === "string" ? data.icon : "🏷️",
    color: typeof data.color === "string" ? data.color : "#64748b",
    isSystem: data.isSystem === true,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 10_000,
    forIncome,
    forExpense,
  };
}

export function CategoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!user) {
      setCategories([]);
      return;
    }
    const uid = user.uid;
    let unsub: (() => void) | undefined;

    void (async () => {
      try {
        await syncCategoryDefaults(uid);
      } catch (e) {
        console.error("Category migration failed:", e);
      }

      unsub = onSnapshot(collection(db, "users", uid, "categories"), (snap) => {
        const next: Category[] = snap.docs
          .map((d) => mapCategoryDoc(d.id, d.data() as Record<string, unknown>))
          .filter((c) => !isLegacyShadowCategoryId(c.id));
        next.sort((a, b) => (a.sortOrder ?? 10_000) - (b.sortOrder ?? 10_000) || a.name.localeCompare(b.name));
        setCategories(next);
      });
    })();

    return () => {
      unsub?.();
    };
  }, [user]);

  const customCategories = useMemo(() => categories.filter((c) => !c.isSystem), [categories]);

  const isSystemCategory = useCallback(
    (id: string) => categories.find((c) => c.id === id)?.isSystem === true,
    [categories],
  );

  const addCategory = useCallback(
    async (input: Pick<Category, "name" | "icon" | "color">): Promise<string> => {
      if (!user) throw new Error("You must be signed in to add a category.");
      const base = input.name.trim();
      if (!base) throw new Error("Category name is required.");
      const generatedId =
        base
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40) || `cat-${Date.now()}`;
      const alreadyExists =
        categories.some((c) => c.id === generatedId || c.name.toLowerCase() === base.toLowerCase()) ||
        RESERVED_CATEGORY_DOC_IDS.has(generatedId);
      if (alreadyExists) throw new Error("A category with this name already exists.");
      const maxSort = categories.reduce((m, c) => Math.max(m, c.sortOrder ?? 0), 0);
      await setDoc(doc(db, "users", user.uid, "categories", generatedId), {
        name: base,
        icon: input.icon?.trim() || "🏷️",
        color: input.color || "#64748b",
        createdAt: new Date().toISOString(),
        isSystem: false,
        sortOrder: maxSort + 1,
        forIncome: false,
        forExpense: true,
      });
      return generatedId;
    },
    [user, categories],
  );

  const updateCategory = useCallback(
    async (id: string, updates: CategoryUpdatePayload) => {
      if (!user) return;
      const ref = doc(db, "users", user.uid, "categories", id);
      const payload: Record<string, unknown> = {};
      if (updates.name != null) payload.name = updates.name.trim();
      if (updates.icon != null) payload.icon = updates.icon.trim() || "🏷️";
      if (updates.color != null) payload.color = updates.color;
      if (updates.forIncome != null) payload.forIncome = updates.forIncome;
      if (updates.forExpense != null) payload.forExpense = updates.forExpense;
      if (updates.sortOrder != null) payload.sortOrder = updates.sortOrder;
      if (Object.keys(payload).length === 0) return;
      await updateDoc(ref, payload);
    },
    [user],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      if (!user) return;
      const ref = doc(db, "users", user.uid, "categories", id);
      await deleteDoc(ref);
    },
    [user],
  );

  const restoreMissingDefaultCategories = useCallback(async () => {
    if (!user) return;
    await restoreMissingDefaultCategoriesApi(user.uid);
  }, [user]);

  const getCategoryById = useCallback(
    (id: string) => {
      const canonical = normalizeCategoryId(id);
      return categories.find((c) => c.id === canonical);
    },
    [categories],
  );

  const value = useMemo(
    () => ({
      categories,
      customCategories,
      addCategory,
      updateCategory,
      deleteCategory,
      restoreMissingDefaultCategories,
      getCategoryById,
      isSystemCategory,
    }),
    [
      categories,
      customCategories,
      addCategory,
      updateCategory,
      deleteCategory,
      restoreMissingDefaultCategories,
      getCategoryById,
      isSystemCategory,
    ],
  );

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export function useCategories() {
  const ctx = useContext(CategoryContext);
  if (!ctx) throw new Error("useCategories must be used within CategoryProvider");
  return ctx;
}

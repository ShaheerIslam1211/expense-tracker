import type { Category, Expense } from "../types";
import { normalizeCategoryId } from "./categoryNormalization";

export function getCategoryDisplayName(expense: Expense, categories: Pick<Category, "id" | "name">[]): string {
  const cid = normalizeCategoryId(expense.categoryId);
  const cat = categories.find((c) => c.id === cid);
  if (cid === "other" && expense.customCategory?.trim()) {
    return expense.customCategory.trim();
  }
  if (cat?.name) return cat.name;
  if (expense.customCategory?.trim()) return expense.customCategory.trim();
  return expense.categoryId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

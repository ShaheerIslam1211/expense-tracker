/**
 * Legacy Firestore category document ids that map to a canonical system id.
 * Old expenses may still use these ids until the next save.
 */
export const CATEGORY_ID_ALIASES: Record<string, string> = {
  groceries: "grocery",
};

export function normalizeCategoryId(id: string): string {
  return CATEGORY_ID_ALIASES[id] ?? id;
}

export function isLegacyShadowCategoryId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(CATEGORY_ID_ALIASES, id);
}

/** Slugs that must not be used for new custom categories (legacy doc ids only). */
export const RESERVED_CATEGORY_DOC_IDS = new Set<string>([...Object.keys(CATEGORY_ID_ALIASES)]);

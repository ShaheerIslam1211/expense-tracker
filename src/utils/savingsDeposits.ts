import { v4 as uuidv4 } from "uuid";
import type { SavingsDepositEntry, SavingsDepositSource } from "../types";

function isDepositSource(v: unknown): v is SavingsDepositSource {
  return v === "salary" || v === "bonus" || v === "windfall" || v === "other";
}

/**
 * Parse Firestore / legacy rows. Missing ids become stable `legacy:…` keys until migrated on write.
 */
export function parseSavingsDeposits(raw: unknown): SavingsDepositEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const o = item as Record<string, unknown>;
    const at = typeof o.at === "string" && o.at ? o.at : new Date().toISOString();
    const amount = Math.floor(Number(o.amount));
    const existingId = typeof o.id === "string" && o.id.trim() ? o.id.trim() : "";
    const id = existingId || `legacy:${index}:${at}:${amount}`;
    const note = typeof o.note === "string" && o.note.trim() ? o.note.trim() : undefined;
    const expenseId = typeof o.expenseId === "string" && o.expenseId.trim() ? o.expenseId.trim() : undefined;
    const source = isDepositSource(o.source) ? o.source : undefined;
    return {
      id,
      at,
      amount: Number.isFinite(amount) ? amount : 0,
      ...(note ? { note } : {}),
      ...(source ? { source } : {}),
      ...(expenseId ? { expenseId } : {}),
    };
  });
}

/** Replace temporary legacy ids with real UUIDs (call before any Firestore write of the array). */
export function materializeSavingsDepositIds(list: SavingsDepositEntry[]): SavingsDepositEntry[] {
  return list.map((d) => (d.id.startsWith("legacy:") ? { ...d, id: uuidv4() } : d));
}

export function lastContributionMonthFromDeposits(deposits: SavingsDepositEntry[]): string | undefined {
  if (!deposits.length) return undefined;
  let best = "";
  for (const d of deposits) {
    const ym = d.at.slice(0, 7);
    if (ym.length === 7 && ym > best) best = ym;
  }
  return best || undefined;
}

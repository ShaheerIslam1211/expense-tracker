import { parseISO } from "date-fns";
import type { Expense } from "../types";

/** Ignore odometer jumps larger than this (likely typo or odometer reset). */
export const MAX_ODOMETER_DELTA_KM = 20_000;

export interface FillEfficiency {
  expenseId: string;
  kmSinceLastFill: number;
  kmPerLiter: number;
}

export function isValidOdometerDelta(kmDelta: number): boolean {
  return kmDelta > 0 && kmDelta < MAX_ODOMETER_DELTA_KM;
}

export function computeKmSinceLastFill(prevOdometerKm: number, curOdometerKm: number): number | null {
  const kmDelta = curOdometerKm - prevOdometerKm;
  return isValidOdometerDelta(kmDelta) ? kmDelta : null;
}

export function computeKmPerLiter(kmSinceLastFill: number, liters: number): number | null {
  if (liters <= 0 || kmSinceLastFill <= 0) return null;
  return kmSinceLastFill / liters;
}

/** Most recent prior fill-up with odometer reading (any fuel expense before optional cutoff date). */
export function getPreviousFuelFillWithOdometer(
  expenses: Expense[],
  opts?: { beforeDate?: string; excludeId?: string },
): Expense | null {
  const beforeMs = opts?.beforeDate ? parseISO(opts.beforeDate).getTime() : Infinity;
  const sorted = expenses
    .filter(
      (e) =>
        e.categoryId === "fuel" &&
        e.type === "expense" &&
        e.fuel?.odometerKm != null &&
        e.id !== opts?.excludeId &&
        parseISO(e.date).getTime() < beforeMs,
    )
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  return sorted[0] ?? null;
}

/** km/L using consecutive odometer readings (liters at fill i cover travel since previous fill). */
export function impliedKmPerLiter(sortedAsc: Expense[]): number | null {
  const withOdo = sortedAsc.filter((e) => e.fuel?.odometerKm != null && (e.fuel?.volumeLiters ?? 0) > 0) as Array<
    Expense & { fuel: NonNullable<Expense["fuel"]> & { odometerKm: number } }
  >;
  if (withOdo.length < 2) return null;
  let totalKm = 0;
  let totalL = 0;
  for (let i = 1; i < withOdo.length; i++) {
    const prev = withOdo[i - 1].fuel.odometerKm;
    const cur = withOdo[i].fuel.odometerKm;
    const kmDelta = cur - prev;
    const L = withOdo[i].fuel.volumeLiters ?? 0;
    if (isValidOdometerDelta(kmDelta) && L > 0) {
      totalKm += kmDelta;
      totalL += L;
    }
  }
  return totalL > 0 ? totalKm / totalL : null;
}

/** Per fill-up efficiency keyed by expense id (ascending date order). */
export function perFillEfficiency(sortedAsc: Expense[]): Map<string, FillEfficiency> {
  const result = new Map<string, FillEfficiency>();
  const withOdo = sortedAsc.filter((e) => e.fuel?.odometerKm != null && (e.fuel?.volumeLiters ?? 0) > 0) as Array<
    Expense & { fuel: NonNullable<Expense["fuel"]> & { odometerKm: number } }
  >;
  for (let i = 1; i < withOdo.length; i++) {
    const prev = withOdo[i - 1].fuel.odometerKm;
    const cur = withOdo[i].fuel.odometerKm;
    const liters = withOdo[i].fuel.volumeLiters ?? 0;
    const kmSinceLastFill = computeKmSinceLastFill(prev, cur);
    const kmPerLiter = kmSinceLastFill != null ? computeKmPerLiter(kmSinceLastFill, liters) : null;
    if (kmSinceLastFill != null && kmPerLiter != null) {
      result.set(withOdo[i].id, { expenseId: withOdo[i].id, kmSinceLastFill, kmPerLiter });
    }
  }
  return result;
}

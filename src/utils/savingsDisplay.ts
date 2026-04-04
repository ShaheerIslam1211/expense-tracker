export function savingsNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return 0;
}

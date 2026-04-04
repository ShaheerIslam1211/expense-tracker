import { useMemo, useState } from "react";
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { Link } from "react-router-dom";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { Fuel, ChevronLeft, ChevronRight, Plus, Gauge, Droplets, Wallet } from "lucide-react";
import { useExpenses } from "../context/ExpenseContext";
import { useCurrency } from "../hooks/useCurrency";
import type { Expense } from "../types";
import { cn } from "../utils/cn";

type FuelRangeMode = "month" | "6months" | "year";

const MONTHS = [
  { v: 1, label: "January" },
  { v: 2, label: "February" },
  { v: 3, label: "March" },
  { v: 4, label: "April" },
  { v: 5, label: "May" },
  { v: 6, label: "June" },
  { v: 7, label: "July" },
  { v: 8, label: "August" },
  { v: 9, label: "September" },
  { v: 10, label: "October" },
  { v: 11, label: "November" },
  { v: 12, label: "December" },
];

function aggregateStats(list: Expense[]) {
  const total = list.reduce((s, e) => s + e.amount, 0);
  const totalVolume = list.reduce((s, e) => s + (e.fuel?.volumeLiters ?? 0), 0);
  const withPrice = list.filter((e) => (e.fuel?.pricePerLiter ?? 0) > 0);
  const avgPrice =
    withPrice.length > 0
      ? withPrice.reduce((s, e) => s + (e.fuel?.pricePerLiter ?? 0), 0) / withPrice.length
      : null;
  const byType: Record<string, { count: number; amount: number; liters: number }> = {};
  for (const e of list) {
    const t = e.fuel?.fuelType ?? "other";
    if (!byType[t]) byType[t] = { count: 0, amount: 0, liters: 0 };
    byType[t].count += 1;
    byType[t].amount += e.amount;
    byType[t].liters += e.fuel?.volumeLiters ?? 0;
  }
  return { total, totalVolume, avgPrice, byType, fillCount: list.length };
}

/** km/L using consecutive odometer readings (liters at fill i cover travel since previous fill). */
function impliedKmPerLiter(sortedAsc: Expense[]): number | null {
  const withOdo = sortedAsc.filter(
    (e) => e.fuel?.odometerKm != null && (e.fuel?.volumeLiters ?? 0) > 0,
  ) as Array<Expense & { fuel: NonNullable<Expense["fuel"]> & { odometerKm: number } }>;
  if (withOdo.length < 2) return null;
  let totalKm = 0;
  let totalL = 0;
  for (let i = 1; i < withOdo.length; i++) {
    const prev = withOdo[i - 1].fuel.odometerKm;
    const cur = withOdo[i].fuel.odometerKm;
    const kmDelta = cur - prev;
    const L = withOdo[i].fuel.volumeLiters ?? 0;
    if (kmDelta > 0 && kmDelta < 20000 && L > 0) {
      totalKm += kmDelta;
      totalL += L;
    }
  }
  return totalL > 0 ? totalKm / totalL : null;
}

export default function FuelPage() {
  const now = new Date();
  const [mode, setMode] = useState<FuelRangeMode>("month");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { getFuelExpenses } = useExpenses();
  const { formatAmount } = useCurrency();

  const anchor = useMemo(() => new Date(year, month - 1, 1), [year, month]);

  const fuelInRange = useMemo(() => {
    if (mode === "month") {
      return getFuelExpenses(year, month);
    }
    if (mode === "year") {
      return getFuelExpenses(year);
    }
    const start = startOfMonth(subMonths(anchor, 5));
    const end = endOfMonth(anchor);
    return getFuelExpenses()
      .filter((e) => {
        const d = parseISO(e.date);
        return isWithinInterval(d, { start, end });
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [mode, year, month, anchor, getFuelExpenses]);

  const stats = useMemo(() => aggregateStats(fuelInRange), [fuelInRange]);

  const kmPerLiter = useMemo(() => {
    const asc = [...fuelInRange].sort(
      (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime(),
    );
    return impliedKmPerLiter(asc);
  }, [fuelInRange]);

  const chartData = useMemo(() => {
    if (mode === "month") {
      const sorted = [...fuelInRange].sort(
        (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime(),
      );
      return sorted.map((e) => ({
        name: format(parseISO(e.date), "d MMM"),
        amount: e.amount,
        liters: e.fuel?.volumeLiters ?? 0,
      }));
    }
    if (mode === "6months") {
      const buckets: { key: string; label: string; amount: number; count: number; liters: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(anchor, i);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const inBucket = fuelInRange.filter((e) => {
          const dd = parseISO(e.date);
          return dd.getFullYear() === y && dd.getMonth() + 1 === m;
        });
        buckets.push({
          key: `${y}-${m}`,
          label: format(d, "MMM yy"),
          amount: inBucket.reduce((s, e) => s + e.amount, 0),
          count: inBucket.length,
          liters: inBucket.reduce((s, e) => s + (e.fuel?.volumeLiters ?? 0), 0),
        });
      }
      return buckets;
    }
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const inMonth = fuelInRange.filter((e) => parseISO(e.date).getMonth() + 1 === m);
      return {
        name: format(new Date(year, i, 1), "MMM"),
        amount: inMonth.reduce((s, e) => s + e.amount, 0),
        count: inMonth.length,
        liters: inMonth.reduce((s, e) => s + (e.fuel?.volumeLiters ?? 0), 0),
      };
    });
  }, [mode, fuelInRange, anchor, year]);

  const hasChart = chartData.some((d) => d.amount > 0);
  const periodLabel =
    mode === "month"
      ? format(anchor, "MMMM yyyy")
      : mode === "6months"
        ? `${format(subMonths(anchor, 5), "MMM yyyy")} – ${format(anchor, "MMM yyyy")}`
        : `${year}`;

  const shiftMonth = (delta: number) => {
    if (mode === "year") {
      setYear((y) => y + delta);
      return;
    }
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };

  const currentCalendarYear = new Date().getFullYear();
  const years = Array.from({ length: 12 }, (_, i) => currentCalendarYear - i);

  const periodBadge =
    mode === "month" ? "Monthly stats" : mode === "6months" ? "6-month stats" : "Yearly stats";

  const totalSpendCaption =
    mode === "month"
      ? `Total fuel spend (${format(anchor, "MMMM yyyy")})`
      : mode === "6months"
        ? `Total fuel spend (${format(subMonths(anchor, 5), "MMM yyyy")} – ${format(anchor, "MMM yyyy")})`
        : `Total fuel spend (${year})`;

  const viewPeriodOptions: { value: FuelRangeMode; label: string }[] = [
    { value: "month", label: "Monthly" },
    { value: "6months", label: "6 months" },
    { value: "year", label: "Yearly" },
  ];

  return (
    <div className="min-h-[calc(100dvh-4rem)] animate-in">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2 max-w-xl">
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-(--fuel)">
              Fuel tracker
            </p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--fuel)/15 text-2xl">
                ⛽
              </span>
              Fuel tracking
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed">
              Monitor your vehicle expenses. Pick <strong className="text-foreground">Monthly</strong>,{" "}
              <strong className="text-foreground">6 months</strong>, or <strong className="text-foreground">Yearly</strong>,
              then choose the year (and month for monthly view). Everything below updates to match.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full lg:w-auto lg:min-w-[17rem]">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">View</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as FuelRangeMode)}
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm font-bold text-foreground shadow-sm focus:ring-2 focus:ring-(--fuel)/40 outline-none"
              >
                {viewPeriodOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm font-bold text-foreground shadow-sm focus:ring-2 focus:ring-(--fuel)/40 outline-none"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {mode !== "year" ? (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  {mode === "6months" ? "End month" : "Month"}
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm font-bold text-foreground shadow-sm focus:ring-2 focus:ring-(--fuel)/40 outline-none"
                >
                  {MONTHS.map((m) => (
                    <option key={m.v} value={m.v}>
                      {m.label}
                    </option>
                  ))}
                </select>
                {mode === "6months" ? (
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Range ends in this month; we include six calendar months up to and including it.
                  </p>
                ) : null}
              </div>
            ) : null}
            <Link
              to="/add"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-(--fuel) px-5 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-(--fuel)/25 transition hover:opacity-95 active:scale-[0.98]"
            >
              <Plus className="h-5 w-5" />
              Add fuel expense
            </Link>
          </div>
        </header>

        <div className="rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selected period</p>
              <p className="text-sm sm:text-base font-black text-foreground mt-1">{periodLabel}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {mode === "year"
                  ? "All fill-ups in this calendar year."
                  : mode === "6months"
                    ? "Six calendar months ending in the selected month and year."
                    : "Only fill-ups in the selected calendar month."}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                aria-label={mode === "year" ? "Previous year" : "Previous month"}
                onClick={() => shiftMonth(-1)}
                className="p-2.5 rounded-xl border border-border hover:bg-accent transition"
              >
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <button
                type="button"
                aria-label={mode === "year" ? "Next year" : "Next month"}
                onClick={() => shiftMonth(1)}
                className="p-2.5 rounded-xl border border-border hover:bg-accent transition"
              >
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="md:col-span-2 rounded-2xl sm:rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm relative overflow-hidden">
            <span className="absolute top-4 right-4 sm:top-5 sm:right-5 px-3 py-1 rounded-full bg-(--fuel)/15 text-(--fuel) text-[10px] sm:text-xs font-black uppercase tracking-wider">
              {periodBadge}
            </span>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium pr-28 sm:pr-36 leading-snug">
              {totalSpendCaption}
            </p>
            <p className="mt-2 text-3xl sm:text-4xl font-black tabular-nums text-(--fuel) tracking-tight">
              {formatAmount(stats.total)}
            </p>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-5 pt-5 border-t border-border">
              <div className="rounded-xl bg-background/80 border border-border/60 p-3 sm:p-4">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <Droplets className="h-3.5 w-3.5 text-primary shrink-0" />
                  Total volume
                </div>
                <p className="mt-1.5 text-lg sm:text-xl font-black tabular-nums text-foreground">
                  {stats.totalVolume > 0 ? `${stats.totalVolume.toFixed(1)} L` : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-background/80 border border-border/60 p-3 sm:p-4">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <Fuel className="h-3.5 w-3.5 text-primary shrink-0" />
                  Avg price/L
                </div>
                <p className="mt-1.5 text-lg sm:text-xl font-black tabular-nums text-foreground">
                  {stats.avgPrice != null ? formatAmount(stats.avgPrice) : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-background/80 border border-border/60 p-3 sm:p-4">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5 text-(--fuel) shrink-0" />
                  Fill-ups
                </div>
                <p className="mt-1.5 text-lg sm:text-xl font-black tabular-nums text-foreground flex items-center gap-2">
                  {stats.fillCount}
                  <span className="text-xl" aria-hidden>
                    ⛽
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl sm:rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              <Gauge className="h-4 w-4 text-primary" />
              Est. km/L
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black tabular-nums text-foreground">
              {kmPerLiter != null ? `${kmPerLiter.toFixed(2)}` : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              From odometer readings between fill-ups in this period.
            </p>
          </div>
        </section>

        {stats.fillCount > 0 ? (
          <section className="rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">By fuel type</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byType).map(([t, v]) => (
                <div
                  key={t}
                  className="rounded-xl border border-border bg-background/80 px-3 py-2 text-xs"
                >
                  <span className="font-black uppercase text-foreground">{t}</span>
                  <span className="text-muted-foreground mx-1.5">·</span>
                  <span className="font-bold tabular-nums">{formatAmount(v.amount)}</span>
                  <span className="text-muted-foreground text-[10px] ml-1">
                    ({v.count}×{v.liters > 0 ? ` ${v.liters.toFixed(1)}L` : ""})
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {hasChart ? (
          <section
            className={cn(
              "rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-sm",
              mode !== "month" && "xl:grid xl:grid-cols-3 xl:gap-8 xl:items-start",
            )}
          >
            <div className={mode !== "month" ? "xl:col-span-2" : ""}>
              <h2 className="text-lg font-black text-foreground mb-1">
                {mode === "month" ? "Fill-ups this month" : "Fuel spend trend"}
              </h2>
              <p className="text-xs text-muted-foreground font-medium mb-4 sm:mb-6">
                {mode === "month"
                  ? "Each bar is one visit to the pump in the selected month."
                  : "Totals per calendar month in your selected view."}
              </p>
              <div className="h-56 sm:h-72 w-full min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={280}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                      interval={mode === "month" && chartData.length > 8 ? "preserveStartEnd" : 0}
                    />
                    <YAxis hide domain={[0, "auto"]} />
                    <Tooltip
                      cursor={{ fill: "var(--surface-hover)", opacity: 0.35 }}
                      contentStyle={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number | undefined) => (value != null ? formatAmount(value) : "—")}
                    />
                    <Bar dataKey="amount" fill="var(--fuel)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {mode !== "month" ? (
              <div className="mt-6 xl:mt-0 rounded-2xl border border-border bg-background/60 p-4 max-h-[280px] xl:max-h-[320px] overflow-y-auto">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">
                  Monthly breakdown
                </p>
                <ul className="space-y-2">
                  {chartData
                    .filter((d) => d.amount > 0)
                    .map((d, i) => (
                      <li key={`${periodLabel}-${i}`} className="flex justify-between items-center text-sm gap-2">
                        <span className="text-muted-foreground font-medium truncate">
                          {"label" in d ? d.label : "name" in d ? d.name : "—"}
                        </span>
                        <span className="font-black tabular-nums text-foreground shrink-0">
                          {formatAmount(d.amount)}
                        </span>
                      </li>
                    ))}
                </ul>
                {!chartData.some((d) => d.amount > 0) ? (
                  <p className="text-xs text-muted-foreground">No spend in this range.</p>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : (
          <section className="rounded-2xl sm:rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
            <p className="text-muted-foreground font-medium text-sm">
              No fuel expenses in <span className="text-foreground font-bold">{periodLabel}</span>. Log a fill-up to see
              charts here.
            </p>
          </section>
        )}

        <section className="rounded-2xl sm:rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6 py-4 border-b border-border bg-accent/5">
            <h2 className="text-lg font-black text-foreground">Fill-up log</h2>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {fuelInRange.length} in period
            </span>
          </div>
          <div className="max-h-[min(28rem,55vh)] sm:max-h-[32rem] overflow-y-auto divide-y divide-border">
            {fuelInRange.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground font-medium">Nothing in this period yet.</div>
            ) : (
              fuelInRange.map((e) => (
                <Link
                  key={e.id}
                  to={`/edit/${e.id}`}
                  className="flex items-center gap-3 sm:gap-4 p-4 sm:px-6 hover:bg-accent/40 transition"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-(--fuel)/15 text-lg">
                    ⛽
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-foreground truncate">
                      {format(parseISO(e.date), "EEE, d MMM yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {e.fuel?.volumeLiters
                        ? `${e.fuel.volumeLiters} L @ ${formatAmount(e.fuel.pricePerLiter ?? 0)}/L`
                        : e.note || "Fuel"}
                      {e.fuel?.fuelType ? ` · ${e.fuel.fuelType}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-sm tabular-nums text-(--fuel)">{formatAmount(e.amount)}</p>
                    {e.fuel?.odometerKm != null ? (
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                        {e.fuel.odometerKm} km
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

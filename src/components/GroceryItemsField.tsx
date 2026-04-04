import { useMemo, useState } from "react";
import { Search, X, Plus } from "lucide-react";
import { GROCERY_CATALOG, getGroceryItemLabel } from "../utils/groceryCatalog";
import { cn } from "../utils/cn";

interface GroceryItemsFieldProps {
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
  /** Use CSS vars from parent (AddExpense) or theme tokens */
  variant?: "default" | "card";
}

export function GroceryItemsField({ selected, onChange, className, variant = "default" }: GroceryItemsFieldProps) {
  const [query, setQuery] = useState("");
  const [customDraft, setCustomDraft] = useState("");

  const toggle = (value: string) => {
    const exists = selected.includes(value);
    onChange(exists ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  const remove = (value: string) => {
    onChange(selected.filter((v) => v !== value));
  };

  const addCustom = () => {
    const t = customDraft.trim();
    if (!t) return;
    const key = `custom:${t}`;
    if (selected.includes(key)) {
      setCustomDraft("");
      return;
    }
    onChange([...selected, key]);
    setCustomDraft("");
  };

  const filteredCatalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GROCERY_CATALOG;
    return GROCERY_CATALOG.map((g) => ({
      ...g,
      items: g.items.filter(
        (it) =>
          it.label.toLowerCase().includes(q) ||
          it.value.toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const isCard = variant === "card";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-4",
        isCard
          ? "border-border bg-card"
          : "border-(--border) bg-(--surface) border-emerald-500/25",
        className,
      )}
    >
      <div>
        <h3 className={cn("font-bold text-sm", isCard ? "text-foreground" : "text-(--text)")}>
          🛒 What did you buy?
        </h3>
        <p className={cn("text-xs mt-1", isCard ? "text-muted-foreground" : "text-(--text-muted)")}>
          Select everything in this trip — saved on the expense so you can compare next month.
        </p>
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((v) => (
            <span
              key={v}
              className={cn(
                "inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-xs font-bold",
                isCard ? "bg-primary/15 text-primary border border-primary/20" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
              )}
            >
              {getGroceryItemLabel(v)}
              <button
                type="button"
                onClick={() => remove(v)}
                className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                aria-label={`Remove ${getGroceryItemLabel(v)}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <Search
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
            isCard ? "text-muted-foreground" : "text-(--text-muted)",
          )}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items…"
          className={cn(
            "w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm font-medium outline-none focus:ring-2",
            isCard
              ? "bg-background border-border focus:ring-primary/30"
              : "bg-(--bg) border-(--border) focus:ring-emerald-500/30",
          )}
        />
      </div>

      <div className="max-h-[min(50vh,320px)] overflow-y-auto space-y-2 pr-1 border border-dashed rounded-xl p-2 border-border/60">
        {filteredCatalog.map((group) => (
          <details key={group.id} className="group rounded-lg border border-border/50 bg-background/50" open={!!query.trim()}>
            <summary className="cursor-pointer px-3 py-2 text-xs font-black uppercase tracking-wider text-muted-foreground list-none flex items-center justify-between">
              {group.label}
              <span className="text-[10px] opacity-60 group-open:rotate-0">▼</span>
            </summary>
            <ul className="px-2 pb-2 pt-1 space-y-1">
              {group.items.map((it) => {
                const active = selected.includes(it.value);
                return (
                  <li key={it.value}>
                    <label
                      className={cn(
                        "flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer text-sm font-medium transition",
                        active
                          ? isCard
                            ? "bg-primary/10 text-foreground"
                            : "bg-emerald-500/10"
                          : "hover:bg-accent/50",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggle(it.value)}
                        className="rounded border-border"
                      />
                      <span>{it.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
        {filteredCatalog.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No matches — add a custom item below.</p>
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={customDraft}
          onChange={(e) => setCustomDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
          placeholder="Anything else? Type and add…"
          className={cn(
            "flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium",
            isCard ? "bg-background border-border" : "bg-(--bg) border-(--border)",
          )}
        />
        <button
          type="button"
          onClick={addCustom}
          className={cn(
            "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wide shrink-0",
            isCard
              ? "bg-primary text-primary-foreground"
              : "bg-emerald-600 text-white hover:bg-emerald-700",
          )}
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
    </div>
  );
}

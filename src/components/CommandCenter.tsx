import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Command, Plus, Shield, Sparkles, X } from "lucide-react";
import { useModal } from "../context/ModalContext";
import { useAppSettings } from "../context/AppSettingsContext";
import { useSensitiveMode } from "../hooks/useSensitiveMode";
import { useModalBehavior } from "../hooks/useModalBehavior";

interface CommandAction {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
  run: () => void;
}

export function CommandCenter() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { showTransactionModal } = useModal();
  const { settings, updateSettings } = useAppSettings();
  const { hideSensitiveValues, toggleSensitiveValues } = useSensitiveMode();
  useModalBehavior(open, () => setOpen(false));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const actions = useMemo<CommandAction[]>(
    () => [
      {
        id: "add-expense",
        title: "Add Transaction",
        subtitle: "Open quick transaction modal",
        keywords: ["add", "expense", "income", "transaction"],
        run: () => showTransactionModal(),
      },
      {
        id: "go-dashboard",
        title: "Go to Dashboard",
        subtitle: "Open main summary view",
        keywords: ["dashboard", "home", "overview"],
        run: () => navigate("/"),
      },
      {
        id: "go-history",
        title: "Go to History",
        subtitle: "Review and filter all transactions",
        keywords: ["history", "transactions", "records"],
        run: () => navigate("/history"),
      },
      {
        id: "go-insights",
        title: "Go to Insights",
        subtitle: "Open advanced analytics",
        keywords: ["insights", "analytics", "reports"],
        run: () => navigate("/insights"),
      },
      {
        id: "go-settings",
        title: "Open Settings",
        subtitle: "Customize app behavior",
        keywords: ["settings", "preferences", "configuration"],
        run: () => navigate("/settings"),
      },
      {
        id: "toggle-privacy",
        title: hideSensitiveValues ? "Disable Privacy Mode" : "Enable Privacy Mode",
        subtitle: "Toggle hidden amounts in UI",
        keywords: ["privacy", "hide", "show", "amounts"],
        run: () => toggleSensitiveValues(),
      },
      {
        id: "toggle-compact-layout",
        title: settings.compactLayout ? "Disable Compact Layout" : "Enable Compact Layout",
        subtitle: "Switch between dense and spacious layout",
        keywords: ["compact", "layout", "ui", "density"],
        run: () => updateSettings({ compactLayout: !settings.compactLayout }),
      },
    ],
    [navigate, showTransactionModal, hideSensitiveValues, toggleSensitiveValues, settings.compactLayout, updateSettings],
  );

  const filtered = actions.filter((action) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      action.title.toLowerCase().includes(q) ||
      action.subtitle.toLowerCase().includes(q) ||
      action.keywords.some((k) => k.includes(q))
    );
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 md:left-auto md:right-32 md:bottom-8 z-40 px-3 py-2 rounded-xl border border-border bg-card/90 backdrop-blur shadow-lg text-xs font-black uppercase tracking-wider text-foreground hover:bg-accent transition-all inline-flex items-center gap-2"
      >
        <Command className="h-4 w-4 text-primary" />
        Command
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-70 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-5 border-b border-border flex items-center gap-3">
                <Command className="h-5 w-5 text-primary" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search actions... (e.g. add expense, privacy mode)"
                  className="flex-1 bg-transparent outline-none text-foreground font-semibold"
                />
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
                  aria-label="Close command center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[60dvh] overflow-y-auto p-3 space-y-2">
                {filtered.length > 0 ? (
                  filtered.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => {
                        action.run();
                        setOpen(false);
                        setQuery("");
                      }}
                      className="w-full text-left p-3 rounded-xl border border-border bg-accent/20 hover:bg-accent/40 transition-all"
                    >
                      <p className="font-black text-sm text-foreground">{action.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{action.subtitle}</p>
                    </button>
                  ))
                ) : (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    No matching action found.
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-t border-border text-[11px] text-muted-foreground flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Fast actions
                </span>
                <span className="inline-flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" /> Privacy controls
                </span>
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Advanced workflow
                </span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

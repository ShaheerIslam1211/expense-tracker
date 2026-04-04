import { useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Plus, RefreshCw, Trash2, X, Tag } from "lucide-react";
import { cn } from "../../utils/cn";
import type { Category } from "../../types";
import type { CategoryUpdatePayload } from "../../context/CategoryContext";

type Props = {
  categories: Category[];
  addCategory: (input: Pick<Category, "name" | "icon" | "color">) => Promise<string>;
  updateCategory: (id: string, updates: CategoryUpdatePayload) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  restoreMissingDefaultCategories: () => Promise<void>;
  onToast: (message: string, variant: "success" | "error") => void;
};

const PRESET_ICONS = ["💰", "🛒", "🍽️", "⛽", "🚗", "🏠", "💡", "❤️", "🎬", "📌", "✈️", "🎁", "📈", "🏦"];

export function CategoryManagerPanel({
  categories,
  addCategory,
  updateCategory,
  deleteCategory,
  restoreMissingDefaultCategories,
  onToast,
}: Props) {
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📁");
  const [newColor, setNewColor] = useState("#6366f1");
  const [editing, setEditing] = useState<Category | null>(null);
  const [editForm, setEditForm] = useState<CategoryUpdatePayload>({});
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [saving, setSaving] = useState(false);

  const openEdit = (c: Category) => {
    setEditing(c);
    setEditForm({
      name: c.name,
      icon: c.icon,
      color: c.color,
      sortOrder: c.sortOrder ?? 0,
      forIncome: c.forIncome === true,
      forExpense: c.forExpense !== false,
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!editForm.name?.trim()) {
      onToast("Name is required", "error");
      return;
    }
    const inc = Boolean(editForm.forIncome);
    const exp = Boolean(editForm.forExpense);
    if (!inc && !exp) {
      onToast("Enable at least one of Income or Expense pickers", "error");
      return;
    }
    setSaving(true);
    try {
      await updateCategory(editing.id, {
        name: editForm.name.trim(),
        icon: editForm.icon?.trim() || "🏷️",
        color: editForm.color,
        sortOrder: typeof editForm.sortOrder === "number" ? editForm.sortOrder : 0,
        forIncome: inc,
        forExpense: exp,
      });
      onToast("Category updated", "success");
      closeEdit();
    } catch (e) {
      console.error(e);
      onToast("Could not save category", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteCategory(deleteTarget.id);
      onToast("Category removed", "success");
      setDeleteTarget(null);
      if (editing?.id === deleteTarget.id) closeEdit();
    } catch (e) {
      console.error(e);
      onToast("Could not delete category", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await addCategory({ name: newName.trim(), icon: newIcon, color: newColor });
      setNewName("");
      onToast("Category created", "success");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to add", "error");
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restoreMissingDefaultCategories();
      onToast("Missing default categories restored", "success");
    } catch (e) {
      console.error(e);
      onToast("Restore failed", "error");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="min-w-0 space-y-1">
          <h2 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">Categories</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Edit names, icons, colors, and income/expense visibility. Delete what you do not need; use restore to add
            back missing defaults only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleRestore()}
          disabled={restoring}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-xs font-black uppercase tracking-widest text-foreground transition hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", restoring && "animate-spin")} />
          Restore missing defaults
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">New category</h3>
            <p className="text-xs text-muted-foreground">Creates a custom expense category (income picker off).</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-5 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Subscriptions"
              className="h-12 w-full rounded-2xl border border-border bg-background/80 px-4 text-sm font-semibold text-foreground outline-none ring-primary/20 transition focus:ring-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:col-span-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Icon</label>
              <input
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-background/80 px-3 text-center text-lg outline-none ring-primary/20 focus:ring-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Color</label>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-12 w-full cursor-pointer rounded-2xl border border-border bg-background p-1"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:col-span-3 lg:justify-end">
            {PRESET_ICONS.slice(0, 8).map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setNewIcon(ic)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-background/60 text-lg transition hover:border-primary/50 hover:bg-primary/5"
              >
                {ic}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleAdd()}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-95 sm:w-auto sm:px-10"
        >
          <Plus className="h-4 w-4" />
          Add category
        </button>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground">
            <Tag className="h-4 w-4 text-primary" />
            All categories ({categories.length})
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((c) => (
            <div
              key={c.id}
              className="group relative flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-inner"
                  style={{ backgroundColor: `${c.color}22` }}
                >
                  {c.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-foreground">{c.name}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {c.isSystem ? "Default set · editable" : "Custom"}
                    {c.forIncome && c.forExpense
                      ? " · Income & expense"
                      : c.forIncome
                        ? " · Income only"
                        : " · Expense only"}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/80">id: {c.id}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background/80 py-2.5 text-xs font-black uppercase tracking-wider text-foreground transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(c)}
                  className="flex items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-destructive transition hover:bg-destructive/15"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-80 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={closeEdit}
            role="presentation"
          >
            <div
              className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cat-edit-title"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur-md">
                <h2 id="cat-edit-title" className="text-lg font-black text-foreground">
                  Edit category
                </h2>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-xl p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-5 p-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Name</label>
                  <input
                    value={editForm.name ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    className="h-12 w-full rounded-2xl border border-border bg-background px-4 font-semibold outline-none ring-primary/20 focus:ring-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Icon
                    </label>
                    <input
                      value={editForm.icon ?? ""}
                      onChange={(e) => setEditForm((p) => ({ ...p, icon: e.target.value }))}
                      className="h-12 w-full rounded-2xl border border-border bg-background px-3 text-center text-lg outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Color
                    </label>
                    <input
                      type="color"
                      value={editForm.color ?? "#6366f1"}
                      onChange={(e) => setEditForm((p) => ({ ...p, color: e.target.value }))}
                      className="h-12 w-full cursor-pointer rounded-2xl border border-border p-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Sort order
                  </label>
                  <input
                    type="number"
                    value={editForm.sortOrder ?? 0}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, sortOrder: parseInt(e.target.value, 10) || 0 }))
                    }
                    className="h-12 w-full rounded-2xl border border-border bg-background px-4 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background/60 p-4 transition hover:border-primary/30">
                    <input
                      type="checkbox"
                      checked={Boolean(editForm.forIncome)}
                      onChange={(e) => setEditForm((p) => ({ ...p, forIncome: e.target.checked }))}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                    <span className="text-sm font-bold text-foreground">Income picker</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background/60 p-4 transition hover:border-primary/30">
                    <input
                      type="checkbox"
                      checked={Boolean(editForm.forExpense)}
                      onChange={(e) => setEditForm((p) => ({ ...p, forExpense: e.target.checked }))}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                    <span className="text-sm font-bold text-foreground">Expense picker</span>
                  </label>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(editing)}
                    className="order-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-5 py-3 text-sm font-black uppercase tracking-wider text-destructive transition hover:bg-destructive/20 sm:order-1 sm:mr-auto"
                  >
                    Delete…
                  </button>
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="order-3 rounded-2xl border border-border px-5 py-3 text-sm font-bold text-muted-foreground sm:order-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSaveEdit()}
                    className="order-1 rounded-2xl bg-primary px-6 py-3 text-sm font-black uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50 sm:order-3"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {deleteTarget &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
              <h3 className="text-lg font-black text-foreground">Delete category?</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Remove <span className="font-bold text-foreground">{deleteTarget.name}</span> from your catalog.
                Past transactions keep their stored category id; you can restore defaults anytime.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleConfirmDelete()}
                  className="rounded-xl bg-destructive px-5 py-2.5 text-sm font-black uppercase tracking-wider text-destructive-foreground disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

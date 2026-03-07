import { useMemo, useState, useEffect } from 'react'
import { useBudget } from '../context/BudgetContext'
import { formatPkr } from '../utils/currency'
import { useUISettings } from '../context/UISettingsContext'
import { useCategories } from '../context/CategoryContext'
import { useExpenses } from '../context/ExpenseContext'

const OPENAI_KEY_STORAGE = 'expense-tracker-openai-key'

function loadStoredApiKey(): string {
  try {
    return localStorage.getItem(OPENAI_KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

function saveApiKey(key: string) {
  try {
    if (key.trim()) localStorage.setItem(OPENAI_KEY_STORAGE, key.trim())
    else localStorage.removeItem(OPENAI_KEY_STORAGE)
  } catch {
    // ignore
  }
}

export default function Settings() {
  const { monthlyBudget, setMonthlyBudget } = useBudget()
  const {
    navPosition,
    navColor,
    navFixed,
    setNavPosition,
    setNavColor,
    setNavFixed,
  } = useUISettings()
  const [budgetInput, setBudgetInput] = useState(String(monthlyBudget))
  const [apiKey, setApiKey] = useState(loadStoredApiKey)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [saved, setSaved] = useState(false)
  const { categories, customCategories, addCategory, updateCategory, deleteCategory } = useCategories()
  const { expenses } = useExpenses()
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('🏷️')
  const [newCategoryColor, setNewCategoryColor] = useState('#64748b')
  const [savingCategory, setSavingCategory] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const [tableSearch, setTableSearch] = useState('')
  const [tableLimit, setTableLimit] = useState(25)
  const [editDrafts, setEditDrafts] = useState<Record<string, { name: string; icon: string; color: string }>>({})

  useEffect(() => {
    setBudgetInput(String(monthlyBudget))
  }, [monthlyBudget])

  const handleBudgetBlur = () => {
    const num = parseInt(budgetInput.replace(/\D/g, ''), 10)
    if (Number.isFinite(num) && num >= 0) {
      setMonthlyBudget(num)
      setBudgetInput(String(num))
    } else {
      setBudgetInput(String(monthlyBudget))
    }
  }

  const handleSaveApiKey = () => {
    saveApiKey(apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
  }, [categories, categorySearch])

  const filteredExpenses = useMemo(() => {
    const q = tableSearch.trim().toLowerCase()
    let list = [...expenses]
    if (q) {
      list = list.filter((e) => {
        const blob = [
          e.id,
          e.categoryId,
          e.customCategory,
          e.note,
          e.merchant,
          e.reference,
          e.amount,
          e.date,
          e.createdAt,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return blob.includes(q)
      })
    }
    return list.slice(0, tableLimit)
  }, [expenses, tableSearch, tableLimit])

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    setSavingCategory(true)
    try {
      await addCategory({
        name: newCategoryName,
        icon: newCategoryIcon || '🏷️',
        color: newCategoryColor,
      })
      setNewCategoryName('')
      setNewCategoryIcon('🏷️')
      setNewCategoryColor('#64748b')
    } finally {
      setSavingCategory(false)
    }
  }

  const beginEditCategory = (id: string, name: string, icon: string, color: string) => {
    setEditDrafts((prev) => ({
      ...prev,
      [id]: { name, icon, color },
    }))
  }

  const saveCategoryEdit = async (id: string) => {
    const draft = editDrafts[id]
    if (!draft) return
    await updateCategory(id, draft)
    setEditDrafts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h2 className="text-xl font-semibold">Settings</h2>

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 space-y-4">
        <h3 className="font-medium">Monthly budget (PKR)</h3>
        <p className="text-sm text-[var(--text-muted)]">
          Default is Rs 60,000. You’ll see how much you’re over or under on the Dashboard.
        </p>
        <input
          type="text"
          inputMode="numeric"
          placeholder="60000"
          value={budgetInput}
          onChange={(e) => setBudgetInput(e.target.value.replace(/\D/g, ''))}
          onBlur={handleBudgetBlur}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-lg"
          aria-label="Monthly budget in Pakistani Rupees"
        />
        <p className="text-sm text-[var(--text-muted)]">
          Current: {formatPkr(monthlyBudget)}
        </p>
      </div>

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 space-y-4">
        <h3 className="font-medium">Receipt scanning (optional)</h3>
        <p className="text-sm text-[var(--text-muted)]">
          Upload a receipt photo on Add expense, then tap “Scan receipt” to extract groceries (Surf, Ketchup, Chicken, etc.) using OCR. No API key needed. For even better results you can add an OpenAI API key below to use AI-powered extraction.
        </p>
        <div className="flex gap-2">
          <input
            type={apiKeyVisible ? 'text' : 'password'}
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
            aria-label="OpenAI API key (optional)"
          />
          <button
            type="button"
            onClick={() => setApiKeyVisible((v) => !v)}
            className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]"
            aria-label={apiKeyVisible ? 'Hide key' : 'Show key'}
          >
            {apiKeyVisible ? '🙈' : '👁'}
          </button>
        </div>
        <button
          type="button"
          onClick={handleSaveApiKey}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90"
        >
          {saved ? 'Saved ✓' : 'Save API key'}
        </button>
      </div>

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 space-y-4">
        <h3 className="font-medium">Navigation & theme</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-[var(--text-muted)] mb-1">Navbar position</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setNavPosition('bottom')}
                className={`flex-1 px-3 py-2 rounded-xl border text-sm text-left ${
                  navPosition === 'bottom'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] bg-[var(--bg)]'
                }`}
              >
                Bottom (mobile-style)
              </button>
              <button
                type="button"
                onClick={() => setNavPosition('top')}
                className={`flex-1 px-3 py-2 rounded-xl border text-sm text-left ${
                  navPosition === 'top'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] bg-[var(--bg)]'
                }`}
              >
                Top (scrolls with page)
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm text-[var(--text-muted)] mb-1">Navbar behavior (top only)</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setNavFixed(true)}
                className={`flex-1 px-3 py-2 rounded-xl border text-sm text-left ${
                  navFixed
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] bg-[var(--bg)]'
                }`}
              >
                Fixed (sticks to top)
              </button>
              <button
                type="button"
                onClick={() => setNavFixed(false)}
                className={`flex-1 px-3 py-2 rounded-xl border text-sm text-left ${
                  !navFixed
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] bg-[var(--bg)]'
                }`}
              >
                Scroll with page
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm text-[var(--text-muted)] mb-1">Navbar color</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setNavColor('dark')}
                className={`flex-1 px-3 py-2 rounded-xl border text-sm text-left ${
                  navColor === 'dark'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] bg-[var(--bg)]'
                }`}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => setNavColor('accent')}
                className={`flex-1 px-3 py-2 rounded-xl border text-sm text-left ${
                  navColor === 'accent'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] bg-[var(--bg)]'
                }`}
              >
                Green accent
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 space-y-4">
        <h3 className="font-medium">Dynamic category manager</h3>
        <p className="text-sm text-[var(--text-muted)]">
          Add your own categories (e.g. Groceries, Kids, Business), edit them, and use them across Add/Edit/History.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            type="text"
            placeholder="Category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="sm:col-span-2 px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
          />
          <input
            type="text"
            placeholder="Icon"
            value={newCategoryIcon}
            onChange={(e) => setNewCategoryIcon(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
          />
          <input
            type="color"
            value={newCategoryColor}
            onChange={(e) => setNewCategoryColor(e.target.value)}
            className="w-full h-10 px-2 py-1 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
          />
        </div>
        <button
          type="button"
          onClick={handleAddCategory}
          disabled={savingCategory || !newCategoryName.trim()}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-medium disabled:opacity-60"
        >
          {savingCategory ? 'Adding...' : 'Add category'}
        </button>

        <input
          type="search"
          placeholder="Search categories..."
          value={categorySearch}
          onChange={(e) => setCategorySearch(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
        />

        <div className="space-y-2 max-h-80 overflow-auto">
          {filteredCategories.map((cat) => {
            const isCustom = customCategories.some((c) => c.id === cat.id)
            const draft = editDrafts[cat.id]
            return (
              <div key={cat.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center">
                  <input
                    type="text"
                    value={draft?.name ?? cat.name}
                    disabled={!isCustom}
                    onChange={(e) =>
                      setEditDrafts((prev) => ({
                        ...prev,
                        [cat.id]: {
                          name: e.target.value,
                          icon: draft?.icon ?? cat.icon,
                          color: draft?.color ?? cat.color,
                        },
                      }))
                    }
                    className="sm:col-span-2 px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] disabled:opacity-70"
                  />
                  <input
                    type="text"
                    value={draft?.icon ?? cat.icon}
                    disabled={!isCustom}
                    onChange={(e) =>
                      setEditDrafts((prev) => ({
                        ...prev,
                        [cat.id]: {
                          name: draft?.name ?? cat.name,
                          icon: e.target.value,
                          color: draft?.color ?? cat.color,
                        },
                      }))
                    }
                    className="px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] disabled:opacity-70"
                  />
                  <input
                    type="color"
                    value={draft?.color ?? cat.color}
                    disabled={!isCustom}
                    onChange={(e) =>
                      setEditDrafts((prev) => ({
                        ...prev,
                        [cat.id]: {
                          name: draft?.name ?? cat.name,
                          icon: draft?.icon ?? cat.icon,
                          color: e.target.value,
                        },
                      }))
                    }
                    className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] disabled:opacity-70"
                  />
                  <div className="text-xs text-[var(--text-muted)]">{cat.id}</div>
                  <div className="flex gap-2 justify-end">
                    {isCustom && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (!draft) beginEditCategory(cat.id, cat.name, cat.icon, cat.color)
                            else void saveCategoryEdit(cat.id)
                          }}
                          className="px-2 py-1 rounded-lg border border-[var(--border)]"
                        >
                          {draft ? 'Save' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`Delete category "${cat.name}"?`)) return
                            void deleteCategory(cat.id)
                          }}
                          className="px-2 py-1 rounded-lg border border-[var(--danger)] text-[var(--danger)]"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {!isCustom && <span className="text-xs text-[var(--text-muted)]">System</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 space-y-4">
        <h3 className="font-medium">Firebase data explorer</h3>
        <p className="text-sm text-[var(--text-muted)]">
          View your expense records in table format with all key columns from Firestore.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="search"
            placeholder="Search rows..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
          />
          <select
            value={tableLimit}
            onChange={(e) => setTableLimit(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
          >
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
            <option value={200}>200 rows</option>
          </select>
        </div>
        <div className="overflow-auto border border-[var(--border)] rounded-xl">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-[var(--surface-hover)]">
              <tr>
                {['ID', 'Date', 'Amount', 'Category', 'Custom Category', 'Merchant', 'Reference', 'Note', 'Created At'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 border-b border-[var(--border)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((e) => (
                <tr key={e.id} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2">{e.id}</td>
                  <td className="px-3 py-2">{e.date?.slice(0, 10)}</td>
                  <td className="px-3 py-2">{e.amount}</td>
                  <td className="px-3 py-2">{e.categoryId}</td>
                  <td className="px-3 py-2">{e.customCategory ?? ''}</td>
                  <td className="px-3 py-2">{e.merchant ?? ''}</td>
                  <td className="px-3 py-2">{e.reference ?? ''}</td>
                  <td className="px-3 py-2 max-w-[380px] truncate">{e.note}</td>
                  <td className="px-3 py-2">{e.createdAt?.slice(0, 19).replace('T', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Showing {filteredExpenses.length} of {expenses.length} rows.
        </p>
      </div>
    </div>
  )
}

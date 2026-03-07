import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { useExpenses } from '../context/ExpenseContext'
import { useCategories } from '../context/CategoryContext'
import type { Expense } from '../types'
import { formatPkr } from '../utils/currency'
import { getCategoryDisplayName } from '../utils/categoryDisplay'

function ExpenseRow({
  expense,
  categories,
  onDelete,
  onPhotoClick,
}: {
  expense: Expense
  categories: Array<{ id: string; icon: string; color: string }>
  onDelete: () => void
  onPhotoClick: () => void
}) {
  const [showNote, setShowNote] = useState(false)
  const cat = categories.find((c) => c.id === expense.categoryId) ?? { id: 'other', icon: '📌', color: '#71717a' }
  const displayName = getCategoryDisplayName(expense)

  return (
    <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
      <div
        className="flex items-center gap-3 p-4"
        onClick={() => setShowNote((n) => !n)}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: cat.color + '30' }}
        >
          {cat.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">
            {displayName}
            {(expense.merchant || expense.note) && (
              <span className="text-[var(--text-muted)] font-normal">
                {' · '}
                {expense.merchant || expense.note}
              </span>
            )}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            {format(parseISO(expense.date), 'dd MMM yyyy')}
            {expense.fuel?.odometerKm != null && (
              <span> · {expense.fuel.odometerKm} km</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {expense.photoDataUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onPhotoClick()
              }}
              className="p-1.5 rounded-lg bg-[var(--surface-hover)]"
              aria-label="View receipt"
            >
              📷
            </button>
          )}
          <span className="font-semibold text-[var(--accent)]">
            {formatPkr(expense.amount)}
          </span>
          <Link
            to={`/edit/${expense.id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg text-[var(--accent)] hover:bg-[var(--accent)]/10"
            aria-label="Edit"
          >
            ✏️
          </Link>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1.5 rounded-lg text-[var(--danger)] hover:bg-[var(--danger)]/10"
            aria-label="Delete"
          >
            🗑️
          </button>
        </div>
      </div>
      {showNote && (expense.note || expense.photoDataUrl) && (
        <div className="px-4 pb-4 pt-0 border-t border-[var(--border)]">
          {expense.note && (
            <p className="text-sm text-[var(--text-muted)] mt-2">{expense.note}</p>
          )}
          {expense.photoDataUrl && (
            <img
              src={expense.photoDataUrl}
              alt="Receipt"
              className="mt-2 rounded-lg max-h-48 w-full object-contain bg-[var(--bg)]"
            />
          )}
        </div>
      )}
    </div>
  )
}

export default function History() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [photoModal, setPhotoModal] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const { getExpensesByMonth, deleteExpense } = useExpenses()
  const { categories } = useCategories()
  const allExpenses = getExpensesByMonth(year, month)
  const expenses = allExpenses
    .filter((e) => {
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        e.note.toLowerCase().includes(q) ||
        String(e.amount).includes(search) ||
        (e.customCategory?.toLowerCase().includes(q) ?? false) ||
        (e.merchant?.toLowerCase().includes(q) ?? false)
      const matchCat =
        categoryFilter === 'all' || e.categoryId === categoryFilter
      return matchSearch && matchCat
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  )

  const handleDelete = (expense: { id: string; note: string; amount: number }) => {
    if (
      window.confirm(
        `Delete expense "${expense.note || 'No note'}" (${formatPkr(expense.amount)})? This cannot be undone.`
      )
    ) {
      deleteExpense(expense.id)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">History</h2>

      <div className="flex gap-2 flex-wrap">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {format(new Date(2000, m - 1), 'MMMM')}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>

      <input
        type="search"
        placeholder="Search by note, amount, merchant..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
      />

      <p className="text-sm text-[var(--text-muted)]">
        {expenses.length} expense{expenses.length !== 1 ? 's' : ''} in{' '}
        {format(new Date(year, month - 1), 'MMMM yyyy')}
      </p>

      <ul className="space-y-3">
        {expenses.map((expense) => (
          <li key={expense.id}>
            <ExpenseRow
              expense={expense}
              categories={categories}
              onDelete={() => handleDelete(expense)}
              onPhotoClick={() =>
                expense.photoDataUrl
                  ? setPhotoModal(expense.photoDataUrl)
                  : null
              }
            />
          </li>
        ))}
      </ul>

      {expenses.length === 0 && (
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-8 text-center text-[var(--text-muted)]">
          No expenses for this month.
        </div>
      )}

      {photoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPhotoModal(null)}
        >
          <img
            src={photoModal}
            alt="Receipt"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

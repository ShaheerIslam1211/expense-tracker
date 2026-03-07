import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { XlviLoader } from 'react-awesome-loaders'
import { useExpenses } from '../context/ExpenseContext'
import { useCategories } from '../context/CategoryContext'
import { AppLoader } from '../components/AppLoader'
import { type CategoryId, type FuelInfo } from '../types'
import { resizeImage, needsResizing } from '../utils/imageResize'

export default function EditExpense() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { expenses, updateExpense } = useExpenses()
  const { categories } = useCategories()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const expense = expenses.find((e) => e.id === id)

  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<CategoryId>('other')
  const [customCategory, setCustomCategory] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [isFuel, setIsFuel] = useState(false)
  const [fuel, setFuel] = useState<FuelInfo>({
    volumeLiters: undefined,
    pricePerLiter: undefined,
    odometerKm: undefined,
    fuelType: 'petrol',
  })
  const [processingPhoto, setProcessingPhoto] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount))
      setCategoryId(expense.categoryId)
      setCustomCategory(expense.customCategory ?? '')
      setNote(expense.note)
      setDate(format(parseISO(expense.date), 'yyyy-MM-dd'))
      setPhotoDataUrl(expense.photoDataUrl ?? null)
      setIsFuel(expense.categoryId === 'fuel')
      setFuel(expense.fuel ?? {
        volumeLiters: undefined,
        pricePerLiter: undefined,
        odometerKm: undefined,
        fuelType: 'petrol',
      })
    }
  }, [expense])

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return

    setProcessingPhoto(true)
    try {
      const dataUrl = needsResizing(file)
        ? await resizeImage(file)
        : await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
      setPhotoDataUrl(dataUrl)
    } catch (err) {
      console.error(err)
      alert('Failed to process image.')
    } finally {
      setProcessingPhoto(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !expense) return

    const num = parseFloat(amount.replace(/,/g, ''))
    if (Number.isNaN(num) || num <= 0) return

    const updates: Record<string, unknown> = {
      amount: num,
      categoryId: isFuel ? 'fuel' : categoryId,
      note: note.trim(),
      date: new Date(date).toISOString(),
    }

    if (photoDataUrl) updates.photoDataUrl = photoDataUrl
    if (categoryId === 'other' && customCategory.trim()) {
      updates.customCategory = customCategory.trim()
    } else if (categoryId !== 'other') {
      updates.customCategory = undefined
    }
    if (isFuel && (fuel.volumeLiters ?? fuel.odometerKm)) {
      updates.fuel = fuel
    } else if (!isFuel) {
      updates.fuel = undefined
    }

    setSaving(true)
    try {
      updateExpense(id, updates as Partial<typeof expense>)
      navigate('/history')
    } finally {
      setSaving(false)
    }
  }

  const isFuelCategory = categoryId === 'fuel'

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <AppLoader className="min-h-[20vh]" />
      </div>
    )
  }

  if (!expense) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--danger)] mb-4">Expense not found.</p>
        <button
          type="button"
          onClick={() => navigate('/history')}
          className="px-4 py-2 rounded-lg bg-[var(--surface-hover)]"
        >
          Back to History
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Edit expense</h2>
        <button
          type="button"
          onClick={() => navigate('/history')}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)]"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Amount (Rs)</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Category</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategoryId(c.id)
                  setIsFuel(c.id === 'fuel')
                }}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-sm transition min-h-16 ${
                  categoryId === c.id
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <span className="text-xl">{c.icon}</span>
                <span className="truncate w-full text-center">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {categoryId === 'other' && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              Specify category (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Gifts, Donations, Repairs..."
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
            />
          </div>
        )}

        {(isFuelCategory || isFuel) && (
          <div className="rounded-xl bg-[var(--surface)] border border-[var(--fuel)]/30 p-4 space-y-3">
            <h3 className="font-medium text-[var(--fuel)]">⛽ Fuel details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)]">Volume (L)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={fuel.volumeLiters ?? ''}
                  onChange={(e) =>
                    setFuel((f) => ({
                      ...f,
                      volumeLiters: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)]">Price/L (Rs)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={fuel.pricePerLiter ?? ''}
                  onChange={(e) =>
                    setFuel((f) => ({
                      ...f,
                      pricePerLiter: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-[var(--text-muted)]">Odometer (km)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={fuel.odometerKm ?? ''}
                  onChange={(e) =>
                    setFuel((f) => ({
                      ...f,
                      odometerKm: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-[var(--text-muted)]">Fuel type</label>
                <select
                  value={fuel.fuelType ?? 'petrol'}
                  onChange={(e) =>
                    setFuel((f) => ({
                      ...f,
                      fuelType: e.target.value as FuelInfo['fuelType'],
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                >
                  <option value="petrol">Petrol</option>
                  <option value="diesel">Diesel</option>
                  <option value="electric">Electric</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Note</label>
          <textarea
            placeholder="Optional note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Receipt photo</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={processingPhoto}
            className="w-full rounded-xl border-2 border-dashed border-[var(--border)] p-6 flex flex-col items-center gap-2 text-[var(--text-muted)] hover:border-[var(--accent)] disabled:opacity-60"
          >
            {processingPhoto ? (
              <div className="flex flex-col items-center gap-2">
                <XlviLoader boxColors={['var(--accent)']} desktopSize="48px" mobileSize="36px" />
                <span>Processing...</span>
              </div>
            ) : photoDataUrl ? (
              <>
                <img src={photoDataUrl} alt="Receipt" className="max-h-32 rounded-lg object-cover" />
                <span className="text-sm">Change photo</span>
              </>
            ) : (
              <>
                <span className="text-3xl">📷</span>
                <span>Tap to add or change receipt</span>
              </>
            )}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="flex-1 py-3 rounded-xl border border-[var(--border)] font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <XlviLoader boxColors={['#fff']} desktopSize="24px" mobileSize="20px" />
                <span>Updating...</span>
              </>
            ) : (
              'Update expense'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

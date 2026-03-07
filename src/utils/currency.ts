/** Pakistani Rupees – format for display (e.g. "Rs 1,500" or "60,000") */
export function formatPkr(amount: number, options?: { compact?: boolean; symbol?: boolean }): string {
  const { compact = false, symbol = true } = options ?? {}
  if (compact && amount >= 1000) {
    const k = amount / 1000
    return symbol ? `Rs ${k % 1 === 0 ? k : k.toFixed(1)}k` : `${k % 1 === 0 ? k : k.toFixed(1)}k`
  }
  const formatted = amount.toLocaleString('en-PK', { maximumFractionDigits: 0, minimumFractionDigits: 0 })
  return symbol ? `Rs ${formatted}` : formatted
}

export const CURRENCY_CODE = 'PKR'
export const CURRENCY_SYMBOL = 'Rs'

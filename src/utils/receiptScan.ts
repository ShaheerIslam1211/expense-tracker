/**
 * Receipt parsing – strict filtering to avoid OCR noise
 */
import type { CategoryId } from '../types'
import { suggestCategory } from './autoCategorize'

export interface ReceiptItem {
  name: string
  amount: number
  quantity?: number
  unitPrice?: number
  categoryId?: CategoryId
}

export interface ParsedReceipt {
  items: ReceiptItem[]
  total?: number
  grossTotal?: number
  netTotal?: number
  date?: string
  merchant?: string
  reference?: string
  address?: string
  customer?: string
  receiptType?: 'health' | 'grocery' | 'fuel' | 'generic'
  description?: string
  currency?: string
}

function normalizeNum(s: string): number {
  return parseFloat(s.replace(/,/g, '').replace(/\s/g, '')) || 0
}

function parseAmountFromEnd(line: string): number | null {
  const trimmed = line.trim()
  const m = trimmed.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*$/) ?? trimmed.match(/(\d+(?:\.\d{1,2})?)\s*(?:Rs\.?|PKR)?\s*$/i)
  if (m) {
    const val = normalizeNum(m[1])
    if (Number.isFinite(val) && val > 0 && val < 10_000_000) return val
  }
  return null
}

function itemNameFromLine(line: string): string {
  return line
    .replace(/\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\s*$/g, '')
    .replace(/\d+(?:\.\d{1,2})?\s*(?:Rs\.?|PKR)?\s*$/gi, '')
    .replace(/Qty\s*\d+\s*Price\s*[\d.]+\s*Total\s*[\d.]+/gi, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim() || ''
}

function extractDate(text: string): string | undefined {
  const m = text.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?\b/)
  if (!m) return undefined
  const d = parseInt(m[1], 10)
  const month = parseInt(m[2], 10) - 1
  let year = parseInt(m[3], 10)
  if (year < 100) year += 2000
  const date = new Date(year, month, d)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10)
}

function extractTotal(text: string): number | undefined {
  const patterns = [
    /(?:Gross\s+)?Total\s*:?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi,
    /Net\s+Total\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi,
    /Amount\s+Due\s*:?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi,
  ]
  let best = 0
  for (const pat of patterns) {
    const re = new RegExp(pat.source, 'gi')
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      const val = normalizeNum(m[1])
      if (val > best && val < 10_000_000) best = val
    }
  }
  return best > 0 ? best : undefined
}

function extractReference(text: string): string | undefined {
  const m = text.match(/(?:No\.?|Ref\.?|#)\s*:?\s*(\d{4,12})/i)
  return m ? m[1].trim() : undefined
}

function extractMerchant(lines: string[]): string | undefined {
  // Common Pakistani pharmacy/store patterns (like Zoho's templates)
  const pharmacyPatterns = [
    /vital\s*\+\s*pharmacy/i,
    /medical\s*\+\s*store/i,
    /pharmacy/i,
    /medical\s*store/i,
    /medical\s*hall/i,
    /pharma/i,
    /dawaai/i,
    /medicine/i,
  ]

  // First pass: look for known pharmacy patterns
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim()
    if (line.length < 4 || line.length > 60) continue

    // Skip obvious noise/garbage
    if (/[|%]{3,}|^[\s|%]+$/.test(line)) continue
    if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(line) && line.length < 25) continue
    if (/no\.?\s*\d{4,}|ref\.?\s*\d{4,}/i.test(line) && line.length < 30) continue
    if (/opp\.|cantt|airport|phase|road|street|rd\.|st\.|walking|cash\s*sales/i.test(line) && line.length < 35) continue
    if (/^[0-9\s\-\.:\(\)]+$/.test(line)) continue

    // Check for pharmacy patterns
    for (const pattern of pharmacyPatterns) {
      if (pattern.test(line)) {
        // Clean up common OCR mistakes
        return line
          .replace(/1/g, 'l')
          .replace(/0/g, 'o')
          .replace(/\|\|+/g, ' ')
          .replace(/%%+/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      }
    }
  }

  // Second pass: look for any business-like name with + or keywords
  for (let i = 0; i < Math.min(6, lines.length); i++) {
    const line = lines[i].trim()
    if (line.length < 4 || line.length > 60) continue
    if (/[|%]{2,}/.test(line)) continue
    if (/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(line)) continue
    if (/^(?:receipt|invoice|bill|no\.|ref|cash|date|time)/i.test(line)) continue
    if (/^[0-9\s\-\.:\(\)]+$/.test(line)) continue

    // Must have some letters and not too many symbols
    const alphaCount = (line.match(/[a-zA-Z]/g) || []).length
    const symbolCount = line.replace(/[\w\s]/g, '').length
    if (alphaCount >= 3 && symbolCount <= line.length * 0.2) {
      return line
        .replace(/1/g, 'l')
        .replace(/0/g, 'o')
        .replace(/\s+/g, ' ')
        .trim()
    }
  }

  return undefined
}

function isNoiseOrTotalLine(line: string, receiptTotal?: number): boolean {
  const lower = line.toLowerCase()

  // Total lines
  if (/^(?:gross\s+)?total\s*:?\s*\d/i.test(lower)) return true
  if (/^net\s+total\s*\d/i.test(lower)) return true
  if (/subtotal|amount\s+due|balance\s*:/i.test(lower)) return true
  if (/change\s+due|cash\s+back/i.test(lower)) return true

  // Footer text
  if (lower.includes('thank you') || lower.includes('no return')) return true
  if (lower.includes('computer software') || lower.includes('developed by')) return true
  if (lower.includes('visit again') || lower.includes('come again')) return true

  // Date/time lines
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\s+\d{1,2}:\d{2}/.test(line)) return true
  if (/^\d{1,2}:\d{2}(?::\d{2})?\s+(?:am|pm)/i.test(line)) return true

  // Reference/ID lines
  if (/no\.?\s*\d{4,}|ref\.?\s*\d{4,}|#?\s*\d{4,}/i.test(line) && line.length < 35) return true
  if (/invoice\s*#|bill\s*#|receipt\s*#/i.test(line) && line.length < 40) return true

  // Address/location lines (Pakistani receipts)
  if (/opp\.|cantt|airport|phase\s*\d|dha|walking\s*cust|cash\s*sales/i.test(lower)) return true
  if (/road|street|rd\.|st\.|sector|block|plot/i.test(lower) && line.length < 40) return true

  // Too many symbols = noise
  if (line.replace(/[\w\s.,-]/g, '').length > line.length * 0.3) return true

  // Lines that match the total amount exactly (duplicate totals)
  if (receiptTotal) {
    const amt = parseAmountFromEnd(line)
    if (amt != null && Math.abs(amt - receiptTotal) < 1) return true
  }

  // Common OCR garbage patterns
  if (/^[|%!\@#$%^&*()[\]{}|\\`~]{2,}/i.test(line)) return true
  if (/^\s*[|%]+\s*$/.test(line)) return true

  return false
}

function isValidItemName(name: string): boolean {
  // Must be long enough
  if (name.length < 6) return false

  // Skip numbered lists that are too short
  if (/^\d+[.)]/.test(name) && name.length < 10) return false

  // Skip obvious garbage with symbols
  if (/[|%]{2,}|[!@#$%^&*()[\]{}|\\`~]{3,}/.test(name)) return false
  if (/^\s*[|%!\@#$%^&*]+\s*$/.test(name)) return false

  // Skip address/location words
  if (/opp\.|cantt|airport|phase|no\.\s*\d|ref\.\s*\d/i.test(name)) return false
  if (/road|street|rd\.|st\.|sector|block|plot|building/i.test(name)) return false

  // Must have enough letters (not just numbers/symbols)
  const alphaCount = (name.match(/[a-zA-Z]/g) || []).length
  if (alphaCount < 3) return false

  // Must have reasonable letter ratio (not mostly numbers/symbols)
  const letterRatio = alphaCount / name.length
  if (letterRatio < 0.3) return false

  // Skip lines that look like dates, times, or references
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(name)) return false
  if (/^\d{1,2}:\d{2}(?::\d{2})?/.test(name)) return false

  // Skip footer/common receipt text
  if (/thank\s+you|visit\s+again|no\s+return|developed\s+by/i.test(name.toLowerCase())) return false

  return true
}

type ReceiptType = 'pharmacy' | 'supermarket' | 'fuel' | 'restaurant' | 'generic'

function detectReceiptType(lines: string[]): ReceiptType {
  const text = lines.join(' ').toLowerCase()

  // Pharmacy indicators
  if (/vital|pharmacy|medical|tablet|capsule|syrup|mg|ml|injection/i.test(text)) {
    return 'pharmacy'
  }

  // Fuel indicators
  if (/petrol|diesel|fuel|pso|shell|caltex|attock|parco|hascol/i.test(text)) {
    return 'fuel'
  }

  // Restaurant indicators
  if (/restaurant|chicken|burger|pizza|coffee|tea/i.test(text)) {
    return 'restaurant'
  }

  // Supermarket indicators
  if (/supermarket|mart|store|grocery|milk|bread|rice/i.test(text)) {
    return 'supermarket'
  }

  return 'generic'
}

function getTemplateParser(receiptType: ReceiptType) {
  // Template-specific preprocessing based on receipt type
  switch (receiptType) {
    case 'pharmacy':
      return (lines: string[]) => {
        // For pharmacy receipts, prioritize medical terms
        return lines.map(line => line.replace(/tab\.?/gi, 'Tablet'))
      }
    case 'fuel':
      return (lines: string[]) => {
        // For fuel receipts, clean up fuel-related terms
        return lines.map(line => line.replace(/ltr\.?/gi, 'Litre'))
      }
    default:
      return (lines: string[]) => lines
  }
}

function isValidPharmacyItem(name: string): boolean {
  // Pharmacy items should contain medical/medication keywords
  const pharmacyKeywords = /tablet|capsule|syrup|injection|cream|ointment|drops|mg|ml|mcg|iu|units?/i
  return pharmacyKeywords.test(name) || /[a-z]{4,}/.test(name) // At least 4 letters
}

function isValidFuelItem(name: string): boolean {
  // Fuel items should be simple (petrol, diesel) or have fuel-related terms
  const fuelKeywords = /petrol|diesel|fuel|litre|liter|l|l\./i
  return fuelKeywords.test(name) || name.length < 20 // Fuel items are usually short
}

export function parseReceiptText(ocrText: string): ParsedReceipt {
  const raw = (ocrText || '').trim()
  if (!raw) return { items: [] }

  const lines = raw
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2)

  // Detect receipt type and apply template-specific parsing
  const receiptType = detectReceiptType(lines)
  const templateParser = getTemplateParser(receiptType)

  const total = extractTotal(raw)
  const date = extractDate(raw)
  const merchant = extractMerchant(lines)
  const reference = extractReference(raw)

  const items: ReceiptItem[] = []
  const seen = new Set<string>()

  // Apply template-specific preprocessing
  const processedLines = templateParser(lines)

  for (const line of processedLines) {
    if (isNoiseOrTotalLine(line, total)) continue

    const amount = parseAmountFromEnd(line)
    if (amount == null || amount <= 0) continue

    const name = itemNameFromLine(line)
    if (!isValidItemName(name)) continue

    // Additional validation for specific receipt types
    if (receiptType === 'pharmacy' && !isValidPharmacyItem(name)) continue
    if (receiptType === 'fuel' && !isValidFuelItem(name)) continue

    const key = `${name.slice(0, 50)}|${amount}`
    if (seen.has(key)) continue
    seen.add(key)

    const categoryId = suggestCategory(name)
    items.push({
      name,
      amount: Math.round(amount * 100) / 100,
      categoryId,
    })
  }

  return {
    items,
    total,
    grossTotal: total,
    date,
    merchant,
    reference,
    description: items[0]?.name,
  }
}

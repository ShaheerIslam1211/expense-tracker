/**
 * Auto-categorization based on item/merchant keywords (Zoho-style)
 * Learns from common receipt patterns
 */
import type { CategoryId } from '../types'
import { CATEGORIES } from '../types'

/** Keywords per category - matches item names, merchant names, notes */
const KEYWORDS: Record<CategoryId, string[]> = {
  fuel: [
    'petrol', 'diesel', 'gas', 'fuel', 'gasoline', 'oil', 'lpg', 'cng',
    'pso', 'shell', 'caltex', 'attock', 'parco', 'hascol', 'total parco',
  ],
  food: [
    'pizza', 'burger', 'mcdonald', 'kfc', 'subway', 'restaurant', 'cafe',
    'coffee', 'tea', 'rice', 'chicken', 'beef', 'mutton', 'bread', 'milk',
    'egg', 'vegetable', 'fruit', 'grocery', 'supermarket', 'mart', 'store',
    'surf', 'ketchup', 'sauce', 'biscuit', 'chocolate', 'snack', 'lunch',
    'dinner', 'breakfast', 'pakistan', 'daal', 'roti', 'naan', 'biryani',
    'karahi', 'tikka', 'burger', 'fries', 'dominos', 'pizza hut',
  ],
  transport: [
    'uber', 'careem', 'taxi', 'bus', 'metro', 'fare', 'parking', 'toll',
    'transport', 'ride', 'petrol pump', 'fuel station',
  ],
  utilities: [
    'electricity', 'gas bill', 'water', 'wapda', 'pti', 'iesco', 'lesco',
    'utility', 'internet', 'wifi', 'ptcl', 'nayatel', 'jazz', 'telenor',
    'zong', 'ufone', 'mobile', 'phone bill',
  ],
  shopping: [
    'mall', 'shop', 'clothes', 'shoes', 'watch', 'electronics', 'laptop',
    'phone', 'amazon', 'daraz', 'aliexpress', 'fashion', 'jewelry',
  ],
  health: [
    'pharmacy', 'medicine', 'hospital', 'clinic', 'doctor', 'medical',
    'health', 'dawaai', 'shifa', 'drug', 'vitamin', 'lab', 'test',
    'vital', 'tab', 'syp', 'mg', 'ml', 'capsule', 'injection',
  ],
  entertainment: [
    'cinema', 'movie', 'netflix', 'spotify', 'game', 'concert', 'show',
    'coke', 'pepsi', 'popcorn', 'cineplex', 'nueplex',
  ],
  bills: [
    'bill', 'rent', 'insurance', 'bank', 'emi', 'loan', 'installment',
  ],
  dad: ['dad', 'father', 'papa'],
  other: [],
}

export function suggestCategory(text: string): CategoryId {
  const lower = text.toLowerCase().trim()
  if (!lower) return 'other'

  let bestMatch: CategoryId = 'other'
  let bestScore = 0

  for (const cat of CATEGORIES) {
    if (cat.id === 'other') continue
    const words = KEYWORDS[cat.id] ?? []
    for (const kw of words) {
      if (lower.includes(kw)) {
        const score = kw.length
        if (score > bestScore) {
          bestScore = score
          bestMatch = cat.id
        }
      }
    }
  }

  return bestMatch
}

/** Get confidence 0-1 for the suggestion */
export function getCategoryConfidence(text: string, categoryId: CategoryId): number {
  if (categoryId === 'other') return 0.5
  const lower = text.toLowerCase().trim()
  const words = KEYWORDS[categoryId] ?? []
  for (const kw of words) {
    if (lower.includes(kw)) return 0.9
  }
  return 0
}

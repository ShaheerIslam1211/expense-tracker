/** Currency formatting utilities */
const CURRENCY_CONFIGS = {
  USD: { symbol: '$', locale: 'en-US', code: 'USD' },
  EUR: { symbol: '€', locale: 'en-EU', code: 'EUR' },
  GBP: { symbol: '£', locale: 'en-GB', code: 'GBP' },
  PKR: { symbol: 'Rs', locale: 'en-PK', code: 'PKR' },
  INR: { symbol: '₹', locale: 'en-IN', code: 'INR' },
  AED: { symbol: 'د.إ', locale: 'ar-AE', code: 'AED' },
  SAR: { symbol: '﷼', locale: 'ar-SA', code: 'SAR' },
  BDT: { symbol: '৳', locale: 'bn-BD', code: 'BDT' },
} as const;

export type CurrencyCode = keyof typeof CURRENCY_CONFIGS;

/** Format amount based on currency code */
export function formatCurrency(amount: number, currencyCode: CurrencyCode = 'PKR', options?: { compact?: boolean; symbol?: boolean }): string {
  const { compact = false, symbol = true } = options ?? {};
  const config = CURRENCY_CONFIGS[currencyCode];

  if (!config) {
    return `${amount}`;
  }

  if (compact && amount >= 1000) {
    const k = amount / 1000;
    return symbol ? `${config.symbol}${k % 1 === 0 ? k : k.toFixed(1)}k` : `${k % 1 === 0 ? k : k.toFixed(1)}k`;
  }

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback for unsupported locales
    const formatted = amount.toLocaleString('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0 });
    return symbol ? `${config.symbol} ${formatted}` : formatted;
  }
}

/** Legacy function for backward compatibility */
export function formatPkr(amount: number, options?: { compact?: boolean; symbol?: boolean }): string {
  return formatCurrency(amount, 'PKR', options);
}

export const CURRENCY_CODE = 'PKR';
export const CURRENCY_SYMBOL = 'Rs';

/** Get available currencies */
export function getAvailableCurrencies() {
  return Object.keys(CURRENCY_CONFIGS) as CurrencyCode[];
}

/** Get currency config */
export function getCurrencyConfig(currencyCode: CurrencyCode) {
  return CURRENCY_CONFIGS[currencyCode];
}

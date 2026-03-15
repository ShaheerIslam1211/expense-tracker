import { useAuth } from "../context/AuthContext";
import { useAppSettings } from "../context/AppSettingsContext";
import { formatCurrency, type CurrencyCode } from "../utils/currency";

export function useCurrency() {
  const { userData } = useAuth();
  const { settings } = useAppSettings();
  const currency = (userData?.currency as CurrencyCode) || "PKR";

  const formatAmount = (amount: number, options?: { compact?: boolean; symbol?: boolean }) => {
    const compact = options?.compact ?? settings.compactNumberFormatting;
    return formatCurrency(amount, currency, { ...options, compact });
  };

  return {
    currency,
    formatAmount,
    formatCurrency: (amount: number, currencyCode?: CurrencyCode, options?: { compact?: boolean; symbol?: boolean }) =>
      formatCurrency(amount, currencyCode || currency, options),
  };
}

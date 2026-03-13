import { useAuth } from "../context/AuthContext";
import { formatCurrency, type CurrencyCode } from "../utils/currency";

export function useCurrency() {
  const { userData } = useAuth();
  const currency = (userData?.currency as CurrencyCode) || "PKR";

  const formatAmount = (amount: number, options?: { compact?: boolean; symbol?: boolean }) => {
    return formatCurrency(amount, currency, options);
  };

  return {
    currency,
    formatAmount,
    formatCurrency: (amount: number, currencyCode?: CurrencyCode, options?: { compact?: boolean; symbol?: boolean }) =>
      formatCurrency(amount, currencyCode || currency, options),
  };
}

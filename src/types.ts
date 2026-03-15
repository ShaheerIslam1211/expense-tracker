export type CategoryId = string;

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
  isSystem?: boolean;
}

export const CATEGORIES: Category[] = [
  { id: "fuel", name: "Fuel", icon: "⛽", color: "#eab308", isSystem: true },
  { id: "food", name: "Food & Dining", icon: "🍽️", color: "#22c55e", isSystem: true },
  { id: "transport", name: "Transport", icon: "🚗", color: "#3b82f6", isSystem: true },
  { id: "utilities", name: "Utilities", icon: "💡", color: "#f59e0b", isSystem: true },
  { id: "shopping", name: "Shopping", icon: "🛒", color: "#ec4899", isSystem: true },
  { id: "health", name: "Health", icon: "❤️", color: "#ef4444", isSystem: true },
  { id: "entertainment", name: "Entertainment", icon: "🎬", color: "#a855f7", isSystem: true },
  { id: "bills", name: "Bills", icon: "📄", color: "#06b6d4", isSystem: true },
  { id: "salary", name: "Salary", icon: "💰", color: "#10b981", isSystem: true },
  { id: "bonus", name: "Bonus", icon: "🎁", color: "#8b5cf6", isSystem: true },
  { id: "investment", name: "Investment", icon: "📈", color: "#3b82f6", isSystem: true },
  { id: "dad", name: "Dad's Expenses", icon: "👨", color: "#0ea5e9", isSystem: true },
  { id: "other", name: "Other", icon: "📌", color: "#71717a", isSystem: true },
];

export interface FuelInfo {
  volumeLiters?: number;
  pricePerLiter?: number;
  odometerKm?: number;
  fuelType?: "petrol" | "diesel" | "electric" | "other";
}

export type CardType = "visa" | "mastercard" | "amex" | "other";

export interface Card {
  id: string;
  bankName: string;
  cardHolderName: string;
  cardNumber: string; // Masked, e.g., **** **** **** 1234
  expiryDate: string;
  cardType: CardType;
  startingBalance: number; // Initial balance when card was added
  color: string; // Theme color for the card
  limit?: number; // Credit limit or monthly spending limit
  linkedBankId?: string; // ID of the bank it's linked to
  billingCycleStart?: number; // Day of the month (1-31)
}

export type PaymentMethodType = "cash" | "card";

export type TransactionType = "expense" | "income";

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurringInfo {
  isRecurring: boolean;
  frequency: RecurringFrequency;
  nextOccurrenceDate: string; // ISO
  lastProcessedDate?: string; // ISO
  endDate?: string; // ISO
}

export interface ExpenseAdvancedDetails {
  subCategory?: string;
  itemType?: string;
  variant?: string;
  provider?: string;
  billType?: string;
  packageType?: string;
  quantity?: string;
  unit?: string;
  dosagePlan?: string;
  inspectionType?: string;
  routeType?: string;
  labTests?: string[];
  customLabTest?: string;
  reports?: Array<{
    name: string;
    mimeType: string;
    dataUrl: string;
  }>;
}

export interface Expense {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  categoryId: CategoryId;
  customCategory?: string; // When categoryId is 'other', user can specify
  note: string;
  merchant?: string;
  reference?: string; // Receipt/invoice number
  date: string; // ISO
  createdAt: string;
  photoDataUrl?: string;
  fuel?: FuelInfo;
  details?: ExpenseAdvancedDetails;
  paymentMethodType: PaymentMethodType;
  paymentMethodId?: string; // Card ID if paymentMethodType is 'card'
  recurring?: RecurringInfo;
}

export interface MonthlySummary {
  year: number;
  month: number;
  total: number;
  byCategory: Record<string, number>;
  expenseCount: number;
  fuelTotal?: number;
  cashTotal: number;
  cardTotal: number;
}

export interface UserData {
  name: string;
  age?: number;
  email: string;
  bio?: string;
  photoUrl?: string;
  phone?: string;
  country?: string;
  timezone?: string;
  companyName?: string;
  companyRole?: string;
  isCompanyLinked?: boolean;
  currency?: string;
  theme?: "light" | "dark" | "system";
  hideSensitiveValues?: boolean;
  appSettings?: {
    defaultTransactionType?: TransactionType;
    defaultPaymentMethodType?: PaymentMethodType;
    autoScanReceiptOnUpload?: boolean;
    compactNumberFormatting?: boolean;
    weekStartsOnMonday?: boolean;
    reducedMotion?: boolean;
    mobileNavbarFixed?: boolean;
    showFloatingAddButton?: boolean;
    showPwaInstallPrompt?: boolean;
    showSidebarTipCard?: boolean;
    compactLayout?: boolean;
  };
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  type: "short-term" | "long-term";
  dueDate?: string;
  color: string;
  icon: string;
  createdAt: string;
}

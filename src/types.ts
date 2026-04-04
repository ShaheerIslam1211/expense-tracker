export type CategoryId = string;

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
  isSystem?: boolean;
  /** Display order (Firestore). Lower first. */
  sortOrder?: number;
  /** Include in income transaction picker. */
  forIncome?: boolean;
  /** Include in expense transaction picker. */
  forExpense?: boolean;
}

/** Default categories for new installs live in `src/data/categorySeed.ts` and are written by migration. */

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
  repairTasks?: string[];
  customRepairTask?: string;
  labTests?: string[];
  customLabTest?: string;
  /** Category Groceries: preset/custom line items (see `groceryCatalog`). */
  groceryItems?: string[];
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
  /** Firebase Storage download URLs (ordered). */
  photoUrls?: string[];
  /** Firebase Storage download URL (legacy single image). */
  photoUrl?: string;
  /** Legacy inline image; still read for old documents. */
  photoDataUrl?: string;
  /**
   * Client-only: ordered `data:` (new) or `https:` (kept) URLs when saving.
   * Never written to Firestore.
   */
  pendingReceiptPhotos?: string[];
  fuel?: FuelInfo;
  details?: ExpenseAdvancedDetails;
  paymentMethodType: PaymentMethodType;
  paymentMethodId?: string; // Card ID if paymentMethodType is 'card'
  recurring?: RecurringInfo;
  /**
   * Income only: dad paid you back for expenses you logged under Dad's expenses.
   * Applied FIFO against oldest dad expenses (through month-end) to lower budget spend.
   */
  dadRecovery?: boolean;
  /** Expense row created when logging a savings goal deposit (budget impact). */
  savingsGoalId?: string;
  savingsDeposit?: boolean;
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
  /** Monthly budget in profile currency; synced across devices when set. */
  monthlyBudget?: number;
  /**
   * After first category migration, defaults are not auto-recreated if the user deletes them.
   * Managed by the app; optional on older profiles until next sync.
   */
  categoryCatalogInitialized?: boolean;
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
    modalLockBackgroundScroll?: boolean;
    modalBackdropBlur?: boolean;
    /** Extra UI contrast for borders and focus rings. */
    highContrastUi?: boolean;
    /** Tighter rows in transaction lists where supported. */
    denseLists?: boolean;
    /** Hint labels on complex controls (where implemented). */
    showTooltips?: boolean;
    /** Ask for confirmation before deleting an expense from history. */
    confirmBeforeDeleteExpense?: boolean;
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
  /** Planned amount to set aside each month toward this goal (e.g. salary saving). */
  monthlyContribution?: number;
  /** Optional gross monthly salary/income for context (e.g. % of income). */
  monthlyIncome?: number;
  /** YYYY-MM of the last time a monthly deposit was recorded. */
  lastContributionMonth?: string;
  /** Private notes (not shown on dashboard cards). */
  notes?: string;
  /**
   * When true (default), recording a deposit also adds an expense so monthly spend reflects
   * money set aside from salary. Turn off if you only want the goal balance without budget impact.
   */
  logDepositAsExpense?: boolean;
  /** Last deposits (newest appended); used for history and “this month” summaries. */
  recentDeposits?: Array<{ at: string; amount: number }>;
}

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Tag,
  CreditCard,
  Wallet,
  Repeat,
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronDown,
  Plus,
  Camera,
  ScanLine,
} from "lucide-react";
import { useExpenses } from "../context/ExpenseContext";
import { useCategories } from "../context/CategoryContext";
import { useCards } from "../context/CardContext";
import { useToast } from "../context/ToastContext";
import { format, parseISO } from "date-fns";
import { cn } from "../utils/cn";
import { useCurrency } from "../hooks/useCurrency";
import { getCurrencyConfig } from "../utils/currency";
import { scanReceiptImage } from "../utils/scanReceiptImage";
import { suggestCategory } from "../utils/autoCategorize";
import { useModalBehavior } from "../hooks/useModalBehavior";
import { useAppSettings } from "../context/AppSettingsContext";
import { resizeDataUrl } from "../utils/imageResize";
import type {
  Expense,
  CategoryId,
  PaymentMethodType,
  TransactionType,
  RecurringFrequency,
  ExpenseAdvancedDetails,
} from "../types";
import { DETAIL_SUBCATEGORY_OPTIONS, FOOD_ITEM_TYPES, LAB_TEST_OPTIONS, buildDetailsSummary } from "../utils/expenseDetails";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: Expense;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, editingTransaction }) => {
  const { addExpense, updateExpense } = useExpenses();
  const { categories, addCategory } = useCategories();
  const { cards } = useCards();
  const { showToast } = useToast();
  const { currency } = useCurrency();
  const { settings } = useAppSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<CategoryId>("other");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [merchant, setMerchant] = useState("");
  const [reference, setReference] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [paymentMethodType, setPaymentMethodType] = useState<PaymentMethodType>("cash");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [details, setDetails] = useState<ExpenseAdvancedDetails>({});
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("🏷️");
  const [newCategoryColor, setNewCategoryColor] = useState("#6366f1");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  useModalBehavior(isOpen, onClose);

  const filteredCategories = useMemo(
    () =>
      categories.filter((c) => {
        if (type === "income") return ["salary", "bonus", "investment", "other"].includes(c.id);
        return !["salary", "bonus", "investment"].includes(c.id);
      }),
    [categories, type],
  );

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type || "expense");
      setAmount(String(editingTransaction.amount));
      setCategoryId(editingTransaction.categoryId);
      setNote(editingTransaction.note);
      setDate(format(parseISO(editingTransaction.date), "yyyy-MM-dd"));
      setMerchant(editingTransaction.merchant || "");
      setReference(editingTransaction.reference || "");
      setPhotoDataUrl(editingTransaction.photoDataUrl);
      setPaymentMethodType(editingTransaction.paymentMethodType);
      setPaymentMethodId(editingTransaction.paymentMethodId || "");
      setIsRecurring(editingTransaction.recurring?.isRecurring || false);
      setFrequency(editingTransaction.recurring?.frequency || "monthly");
      setDetails(editingTransaction.details || {});
    } else {
      // Reset form
      setType(settings.defaultTransactionType);
      setAmount("");
      setCategoryId("other");
      setNote("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setMerchant("");
      setReference("");
      setPhotoDataUrl(undefined);
      setPaymentMethodType(settings.defaultPaymentMethodType);
      if (settings.defaultPaymentMethodType === "card" && cards.length > 0) setPaymentMethodId(cards[0].id);
      else setPaymentMethodId("");
      setIsRecurring(false);
      setFrequency("monthly");
      setDetails({});
    }
    setShowAddCategory(false);
    setNewCategoryName("");
    setNewCategoryIcon("🏷️");
    setNewCategoryColor("#6366f1");
    setScanProgress(0);
  }, [editingTransaction, isOpen, settings.defaultTransactionType, settings.defaultPaymentMethodType, cards]);

  useEffect(() => {
    const validOptions = DETAIL_SUBCATEGORY_OPTIONS[categoryId] ?? [];
    if (validOptions.length === 0) {
      if (Object.keys(details).length > 0) setDetails({});
      return;
    }
    if (!details.subCategory || !validOptions.some((option) => option.value === details.subCategory)) {
      const nextSubCategory = validOptions[0].value;
      setDetails((prev) => ({
        ...prev,
        subCategory: nextSubCategory,
      }));
    }
  }, [categoryId, details]);

  useEffect(() => {
    if (filteredCategories.length === 0) return;
    if (!filteredCategories.some((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0].id);
    }
    // Keep category valid when switching transaction type.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      showToast("Category name is required", "error");
      return;
    }
    setIsAddingCategory(true);
    try {
      await addCategory({ name, icon: newCategoryIcon, color: newCategoryColor });
      const generatedId =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40) || `cat-${Date.now()}`;
      setCategoryId(generatedId);
      setShowAddCategory(false);
      setNewCategoryName("");
      showToast("Category added", "success");
    } catch (error) {
      console.error("Failed to add category:", error);
      showToast("Failed to add category", "error");
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setPhotoDataUrl(dataUrl);
      setScanProgress(0);
      if (settings.autoScanReceiptOnUpload) {
        setIsScanning(true);
        try {
          const parsed = await scanReceiptImage(dataUrl, setScanProgress);
          const parsedAmount = parsed.total ?? parsed.grossTotal ?? parsed.netTotal;
          if (parsedAmount != null) setAmount(String(parsedAmount));
          if (parsed.date) setDate(parsed.date);
          if (parsed.merchant) setMerchant(parsed.merchant);
          if (parsed.reference) setReference(parsed.reference);
          if (parsed.description) setNote((prev) => prev || parsed.description || "");
          if (parsed.merchant && !note) setNote(parsed.merchant);
          if (parsed.receiptType === "fuel") setCategoryId("fuel");
          else if (parsed.receiptType === "health") setCategoryId("health");
          else if (parsed.merchant) setCategoryId(suggestCategory(parsed.merchant));
          showToast("Receipt auto-scanned", "success");
        } catch (scanError) {
          console.error("Auto-scan failed:", scanError);
          showToast("Receipt uploaded (auto-scan failed)", "error");
        } finally {
          setIsScanning(false);
        }
      }
    } catch (error) {
      console.error("Failed to read image:", error);
      showToast("Failed to load image", "error");
    }
  };

  const handleScanReceipt = async () => {
    if (!photoDataUrl) {
      showToast("Upload receipt image first", "error");
      return;
    }
    setIsScanning(true);
    try {
      const parsed = await scanReceiptImage(photoDataUrl, setScanProgress);

      const parsedAmount = parsed.total ?? parsed.grossTotal ?? parsed.netTotal;
      if (parsedAmount != null) setAmount(String(parsedAmount));
      if (parsed.date) setDate(parsed.date);
      if (parsed.merchant) setMerchant(parsed.merchant);
      if (parsed.reference) setReference(parsed.reference);
      if (parsed.description) setNote((prev) => prev || parsed.description || "");
      if (parsed.merchant && !note) setNote(parsed.merchant);

      if (parsed.receiptType === "fuel") setCategoryId("fuel");
      else if (parsed.receiptType === "health") setCategoryId("health");
      else if (parsed.merchant) setCategoryId(suggestCategory(parsed.merchant));

      showToast("Receipt scanned successfully", "success");
    } catch (error) {
      console.error("Receipt scan failed:", error);
      showToast("Receipt scan failed", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const supportsAdvancedDetails = type === "expense" && Boolean(DETAIL_SUBCATEGORY_OPTIONS[categoryId]?.length);
  const isFoodGrocery = categoryId === "food" && details.subCategory === "groceries";
  const isCookingOil = isFoodGrocery && details.itemType === "cooking-oil";
  const isBillsMobilePackage = categoryId === "bills" && details.subCategory === "mobile-package";
  const isDadInspectorVisit = categoryId === "dad" && details.subCategory === "inspector-visit";
  const isTransportRideApp = categoryId === "transport" && ["indrive", "yango", "uber-careem"].includes(details.subCategory ?? "");
  const isHealthInsulin = categoryId === "health" && (details.subCategory?.startsWith("insulin") ?? false);
  const isHealthLabTest = categoryId === "health" && details.subCategory === "lab-test";

  const updateDetails = (updates: Partial<ExpenseAdvancedDetails>) => {
    setDetails((prev) => ({ ...prev, ...updates }));
  };

  const toggleLabTest = (testValue: string) => {
    setDetails((prev) => {
      const current = prev.labTests ?? [];
      const exists = current.includes(testValue);
      const next = exists ? current.filter((t) => t !== testValue) : [...current, testValue];
      return { ...prev, labTests: next };
    });
  };

  const handleReportUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    try {
      const uploaded = await Promise.all(
        files.slice(0, 3).map(async (file) => {
          if (file.type.startsWith("image/")) {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            const optimized = await resizeDataUrl(dataUrl, 450 * 1024, 1200, 0.84);
            return { name: file.name, mimeType: file.type, dataUrl: optimized };
          }

          if (file.type === "application/pdf") {
            if (file.size > 550 * 1024) {
              throw new Error(`${file.name} is too large. Keep PDF under ~550KB.`);
            }
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            return { name: file.name, mimeType: file.type, dataUrl };
          }

          throw new Error(`${file.name} is unsupported. Upload image or PDF.`);
        }),
      );

      setDetails((prev) => ({
        ...prev,
        reports: [...(prev.reports ?? []), ...uploaded].slice(0, 5),
      }));
      showToast("Test report uploaded", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload report";
      showToast(message, "error");
    } finally {
      event.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    setIsSaving(true);

    const normalizedDetails = supportsAdvancedDetails
      ? ({
          ...Object.fromEntries(
            Object.entries(details).filter(([, value]) => typeof value === "string" && value.trim().length > 0),
          ),
          ...(details.labTests?.length ? { labTests: details.labTests } : {}),
          ...(details.reports?.length ? { reports: details.reports } : {}),
        } as ExpenseAdvancedDetails)
      : undefined;
    const detailsSummary = normalizedDetails ? buildDetailsSummary(normalizedDetails) : "";
    const normalizedNote = note.trim() || detailsSummary;

    const transactionData: Omit<Expense, "id" | "createdAt"> = {
      type,
      amount: Number(amount),
      currency: currency,
      categoryId,
      note: normalizedNote,
      date: new Date(date).toISOString(),
      merchant: merchant || undefined,
      reference: reference || undefined,
      photoDataUrl,
      details: normalizedDetails && Object.keys(normalizedDetails).length > 0 ? normalizedDetails : undefined,
      paymentMethodType,
      paymentMethodId: paymentMethodType === "card" ? paymentMethodId : undefined,
    };

    if (isRecurring) {
      transactionData.recurring = {
        isRecurring: true,
        frequency,
        nextOccurrenceDate: new Date(date).toISOString(), // Start from selected date
      };
    }

    try {
      if (editingTransaction) {
        await updateExpense(editingTransaction.id, transactionData);
        showToast("Transaction updated successfully", "success");
      } else {
        await addExpense(transactionData);
        showToast("Transaction added successfully", "success");
      }
      onClose();
    } catch (error) {
      console.error("Error saving transaction:", error);
      showToast("Failed to save transaction", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
            {/* Modal */}
            <motion.div
              initial={{ y: "100%", opacity: 1, scale: 1 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-2xl bg-background border-t sm:border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] pointer-events-auto"
            >
              {/* Header */}
              <div className="p-4 sm:p-6 flex items-center justify-between border-b border-border bg-card">
                <h2 className="text-lg sm:text-xl font-black text-foreground">
                  {editingTransaction ? "Edit Transaction" : "Add Transaction"}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-accent rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                id="transaction-form"
                onSubmit={handleSubmit}
                className="p-4 sm:p-6 overflow-y-auto space-y-6"
              >
                {/* Type Toggle */}
                <div className="flex p-1 bg-accent/30 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setType("expense")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all",
                      type === "expense"
                        ? "bg-danger text-white shadow-lg"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ArrowDownCircle className="h-5 w-5" />
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("income")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all",
                      type === "income"
                        ? "bg-success text-white shadow-lg"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ArrowUpCircle className="h-5 w-5" />
                    Income
                  </button>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="text-sm font-black text-muted-foreground uppercase tracking-widest">Amount</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground">
                      {getCurrencyConfig(currency)?.symbol}
                    </div>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      className="w-full pl-14 pr-6 py-5 bg-card border border-border rounded-2xl text-3xl font-black focus:border-primary outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Category Selection + Quick Add */}
                <div className="space-y-3">
                  <label className="text-sm font-black text-muted-foreground uppercase tracking-widest">Category</label>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                    <div className="relative">
                      <select
                        value={categoryId}
                        onChange={(e) => {
                          setCategoryId(e.target.value as CategoryId);
                          setDetails({});
                        }}
                        className="w-full appearance-none px-4 py-3.5 bg-card border border-border rounded-2xl font-bold outline-none focus:border-primary transition-all"
                      >
                        {filteredCategories.map((cat) => (
                          <option
                            key={cat.id}
                            value={cat.id}
                          >
                            {cat.icon} {cat.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="h-4 w-4 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddCategory((prev) => !prev)}
                      className="px-4 py-3.5 rounded-2xl border border-border bg-card hover:bg-accent font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      New Category
                    </button>
                  </div>

                  {showAddCategory && (
                    <div className="p-4 rounded-2xl border border-border bg-accent/20 space-y-3">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        Add category from modal
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_72px_96px_auto] gap-2">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Category name"
                          className="px-3 py-2.5 bg-background border border-border rounded-xl font-bold text-sm outline-none focus:border-primary"
                        />
                        <input
                          type="text"
                          value={newCategoryIcon}
                          onChange={(e) => setNewCategoryIcon(e.target.value)}
                          className="px-3 py-2.5 bg-background border border-border rounded-xl text-center"
                          placeholder="🏷️"
                        />
                        <input
                          type="color"
                          value={newCategoryColor}
                          onChange={(e) => setNewCategoryColor(e.target.value)}
                          className="h-11 bg-background border border-border rounded-xl cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={handleAddCategory}
                          disabled={isAddingCategory}
                          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest disabled:opacity-60"
                        >
                          {isAddingCategory ? "Adding..." : "Add"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Receipt OCR */}
                {supportsAdvancedDetails && (
                  <div className="p-4 rounded-2xl border border-border bg-accent/20 space-y-3">
                    <p className="text-sm font-black text-foreground">Advanced Category Details</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      Dynamic fields based on selected category
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                          Sub Type
                        </label>
                        <select
                          value={details.subCategory ?? ""}
                          onChange={(e) =>
                            updateDetails({
                              subCategory: e.target.value,
                              itemType: undefined,
                              variant: undefined,
                              packageType: undefined,
                              inspectionType: undefined,
                              routeType: undefined,
                              quantity: undefined,
                              unit: undefined,
                              dosagePlan: undefined,
                              labTests: undefined,
                              customLabTest: undefined,
                            })
                          }
                          className="w-full px-3 py-3 bg-card border border-border rounded-xl font-bold text-sm"
                        >
                          {(DETAIL_SUBCATEGORY_OPTIONS[categoryId] ?? []).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {(categoryId === "food" || categoryId === "shopping" || categoryId === "health") && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                            Item Type
                          </label>
                          <select
                            value={details.itemType ?? ""}
                            onChange={(e) => updateDetails({ itemType: e.target.value })}
                            className="w-full px-3 py-3 bg-card border border-border rounded-xl font-bold text-sm"
                          >
                            <option value="">Select item type</option>
                            {(categoryId === "food" ? FOOD_ITEM_TYPES : []).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                            {categoryId === "shopping" && (
                              <>
                                <option value="clothes">Clothes</option>
                                <option value="footwear">Footwear</option>
                                <option value="electronics">Electronics</option>
                                <option value="home-items">Home Items</option>
                                <option value="accessories">Accessories</option>
                                <option value="other-shopping">Other</option>
                              </>
                            )}
                            {categoryId === "health" && (
                              <>
                                <option value="apidra">Apidra</option>
                                <option value="lantus">Lantus</option>
                                <option value="apidra-lantus">Apidra + Lantus</option>
                                <option value="sugar-medicine">Sugar Medicine</option>
                                <option value="test-strips">Test Strips</option>
                                <option value="normal-medicine">Normal Medicine</option>
                              </>
                            )}
                          </select>
                        </div>
                      )}

                      {isCookingOil && (
                        <>
                          <div className="space-y-1">
                            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={details.quantity ?? ""}
                              onChange={(e) => updateDetails({ quantity: e.target.value })}
                              placeholder="e.g. 5"
                              className="w-full px-3 py-3 bg-card border border-border rounded-xl font-bold text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                              Unit
                            </label>
                            <select
                              value={details.unit ?? "litre"}
                              onChange={(e) => updateDetails({ unit: e.target.value })}
                              className="w-full px-3 py-3 bg-card border border-border rounded-xl font-bold text-sm"
                            >
                              <option value="litre">Litre</option>
                              <option value="ml">Millilitre</option>
                            </select>
                          </div>
                        </>
                      )}

                      {isBillsMobilePackage && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                            Package Type
                          </label>
                          <select
                            value={details.packageType ?? ""}
                            onChange={(e) => updateDetails({ packageType: e.target.value })}
                            className="w-full px-3 py-3 bg-card border border-border rounded-xl font-bold text-sm"
                          >
                            <option value="">Select package</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="postpaid">Postpaid</option>
                          </select>
                        </div>
                      )}

                      {isDadInspectorVisit && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                            Inspection Type
                          </label>
                          <select
                            value={details.inspectionType ?? ""}
                            onChange={(e) => updateDetails({ inspectionType: e.target.value })}
                            className="w-full px-3 py-3 bg-card border border-border rounded-xl font-bold text-sm"
                          >
                            <option value="">Select inspection</option>
                            <option value="property">Property Check</option>
                            <option value="utility">Utility Check</option>
                            <option value="document">Document Verification</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      )}

                      {isTransportRideApp && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                            Route Type
                          </label>
                          <select
                            value={details.routeType ?? ""}
                            onChange={(e) => updateDetails({ routeType: e.target.value })}
                            className="w-full px-3 py-3 bg-card border border-border rounded-xl font-bold text-sm"
                          >
                            <option value="">Select route</option>
                            <option value="one-way">One Way</option>
                            <option value="round-trip">Round Trip</option>
                            <option value="within-city">Within City</option>
                            <option value="inter-city">Inter City</option>
                          </select>
                        </div>
                      )}

                      {isHealthInsulin && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                            Dosage Plan
                          </label>
                          <select
                            value={details.dosagePlan ?? ""}
                            onChange={(e) => updateDetails({ dosagePlan: e.target.value })}
                            className="w-full px-3 py-3 bg-card border border-border rounded-xl font-bold text-sm"
                          >
                            <option value="">Select plan</option>
                            <option value="once-daily">Once Daily</option>
                            <option value="twice-daily">Twice Daily</option>
                            <option value="as-needed">As Needed</option>
                          </select>
                        </div>
                      )}

                      {isHealthLabTest && (
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                            Select Lab Tests (Multi Select)
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {LAB_TEST_OPTIONS.map((test) => {
                              const active = details.labTests?.includes(test.value) ?? false;
                              return (
                                <button
                                  key={test.value}
                                  type="button"
                                  onClick={() => toggleLabTest(test.value)}
                                  className={cn(
                                    "px-3 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider text-left transition-all",
                                    active
                                      ? "bg-primary/10 border-primary text-primary"
                                      : "bg-card border-border text-muted-foreground hover:bg-accent",
                                  )}
                                >
                                  {test.label}
                                </button>
                              );
                            })}
                          </div>
                          <input
                            type="text"
                            value={details.customLabTest ?? ""}
                            onChange={(e) => updateDetails({ customLabTest: e.target.value })}
                            placeholder="Custom test name (optional)"
                            className="w-full px-3 py-3 bg-card border border-border rounded-xl font-bold text-sm"
                          />
                        </div>
                      )}

                      {categoryId === "health" && (
                        <div className="md:col-span-2 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                              Upload Test Reports (PDF / Images)
                            </label>
                            <button
                              type="button"
                              onClick={() => reportInputRef.current?.click()}
                              className="px-3 py-2 rounded-lg border border-border bg-card text-xs font-black uppercase tracking-wider hover:bg-accent"
                            >
                              Upload Report
                            </button>
                            <input
                              ref={reportInputRef}
                              type="file"
                              accept="image/*,application/pdf"
                              multiple
                              className="hidden"
                              onChange={handleReportUpload}
                            />
                          </div>
                          {(details.reports?.length ?? 0) > 0 && (
                            <div className="space-y-2">
                              {details.reports?.map((report, index) => (
                                <div
                                  key={`${report.name}-${index}`}
                                  className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
                                >
                                  <p className="text-xs font-bold text-foreground truncate pr-2">
                                    {report.mimeType === "application/pdf" ? "PDF" : "Image"} - {report.name}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDetails((prev) => ({
                                        ...prev,
                                        reports: (prev.reports ?? []).filter((_, i) => i !== index),
                                      }))
                                    }
                                    className="text-[11px] font-black uppercase tracking-wider text-destructive"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {(categoryId === "dad" ||
                        categoryId === "bills" ||
                        categoryId === "transport" ||
                        categoryId === "utilities") && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                            Provider / Source
                          </label>
                          <input
                            type="text"
                            value={details.provider ?? ""}
                            onChange={(e) => updateDetails({ provider: e.target.value })}
                            placeholder="e.g. K-Electric, Courier Service, InDrive"
                            className="w-full px-3 py-3 bg-card border border-border rounded-xl font-bold text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Receipt OCR */}
                <div className="p-4 rounded-2xl border border-border bg-accent/20 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-foreground">Receipt Scan (OCR)</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                        Upload image and extract amount/date/merchant
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl border border-border bg-background hover:bg-accent text-xs font-black uppercase tracking-widest flex items-center gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Upload
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </div>

                  {photoDataUrl && (
                    <div className="space-y-3">
                      <img
                        src={photoDataUrl}
                        alt="Receipt preview"
                        className="max-h-28 sm:max-h-36 rounded-xl object-cover border border-border"
                      />
                      <button
                        type="button"
                        onClick={handleScanReceipt}
                        disabled={isScanning}
                        className="w-full py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        <ScanLine className="h-4 w-4" />
                        {isScanning ? `Scanning... ${Math.round(scanProgress * 100)}%` : "Extract Text"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-muted-foreground uppercase tracking-widest">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl font-bold focus:border-primary outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-muted-foreground uppercase tracking-widest">
                      Description
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="What was this for?"
                        className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl font-bold focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-muted-foreground uppercase tracking-widest">Merchant</label>
                    <input
                      type="text"
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      placeholder="Store / merchant name"
                      className="w-full px-4 py-4 bg-card border border-border rounded-2xl font-bold outline-none focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-muted-foreground uppercase tracking-widest">Reference</label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Receipt or invoice number"
                      className="w-full px-4 py-4 bg-card border border-border rounded-2xl font-bold outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-3">
                  <label className="text-sm font-black text-muted-foreground uppercase tracking-widest">
                    Payment Method
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethodType("cash")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border font-bold transition-all",
                        paymentMethodType === "cash"
                          ? "bg-success/10 border-success text-success shadow-sm"
                          : "bg-card border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      <Wallet className="h-5 w-5" />
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethodType("card")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border font-bold transition-all",
                        paymentMethodType === "card"
                          ? "bg-primary/10 border-primary text-primary shadow-sm"
                          : "bg-card border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      <CreditCard className="h-5 w-5" />
                      Card
                    </button>
                  </div>

                  {paymentMethodType === "card" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="pt-2"
                    >
                      <select
                        value={paymentMethodId}
                        onChange={(e) => setPaymentMethodId(e.target.value)}
                        className="w-full px-4 py-4 bg-card border border-border rounded-2xl font-bold outline-none focus:border-primary transition-all"
                        required={paymentMethodType === "card"}
                      >
                        <option value="">Select a card</option>
                        {cards.map((card) => (
                          <option
                            key={card.id}
                            value={card.id}
                          >
                            {card.bankName} (**** {card.cardNumber.slice(-4)})
                          </option>
                        ))}
                      </select>
                    </motion.div>
                  )}
                </div>

                {/* Recurring Options */}
                <div className="p-4 bg-accent/20 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl text-primary">
                        <Repeat className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-black text-sm text-foreground">Recurring Transaction</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Automate this entry</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRecurring(!isRecurring)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        isRecurring ? "bg-primary" : "bg-border",
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          isRecurring ? "left-7" : "left-1",
                        )}
                      />
                    </button>
                  </div>

                  {isRecurring && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="grid grid-cols-2 gap-3"
                    >
                      {(["daily", "weekly", "monthly", "yearly"] as RecurringFrequency[]).map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => setFrequency(freq)}
                          className={cn(
                            "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                            frequency === freq
                              ? "bg-primary border-primary text-white"
                              : "bg-card border-border text-muted-foreground hover:bg-accent",
                          )}
                        >
                          {freq}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </form>

              {/* Footer */}
              <div className="p-4 sm:p-6 border-t border-border bg-card flex gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl border border-border font-black text-xs uppercase tracking-widest hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="transaction-form"
                  disabled={isSaving}
                  className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingTransaction ? "Update" : "Add Transaction"}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

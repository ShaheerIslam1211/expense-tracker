import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { XlviLoader } from "react-awesome-loaders";
import { useExpenses } from "../context/ExpenseContext";
import { useCategories } from "../context/CategoryContext";
import { type CategoryId, type FuelInfo } from "../types";
import { formatPkr } from "../utils/currency";
import { scanReceiptImage } from "../utils/scanReceiptImage";
import { resizeDataUrl } from "../utils/imageResize";
import { suggestCategory } from "../utils/autoCategorize";
import type { ReceiptItem } from "../utils/receiptScan";

export default function AddExpense() {
  const navigate = useNavigate();
  const { addExpense, expenses } = useExpenses();
  const { categories } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<CategoryId>("other");
  const [customCategory, setCustomCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [merchant, setMerchant] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isFuel, setIsFuel] = useState(false);
  const [fuel, setFuel] = useState<FuelInfo>({
    volumeLiters: undefined,
    pricePerLiter: undefined,
    odometerKm: undefined,
    fuelType: "petrol",
  });
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedItems, setScannedItems] = useState<ReceiptItem[]>([]);
  const [parsedTotal, setParsedTotal] = useState<number | undefined>();
  const [parsedDate, setParsedDate] = useState<string | undefined>();
  const [parsedMerchant, setParsedMerchant] = useState<string | undefined>();
  const [parsedReference, setParsedReference] = useState<string | undefined>();
  const [parsedDescription, setParsedDescription] = useState<string | undefined>();
  const [parsedReceiptType, setParsedReceiptType] = useState<"health" | "grocery" | "fuel" | "generic" | undefined>();
  const [healthDetails, setHealthDetails] = useState("");
  const [accuracyConfirmed, setAccuracyConfirmed] = useState<boolean | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    setProcessingPhoto(true);
    setAccuracyConfirmed(null);
    try {
      // Use ORIGINAL image for OCR - better accuracy like Zoho
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setPhotoDataUrl(dataUrl);
      setScannedItems([]);
      setParsedTotal(undefined);
      setParsedDate(undefined);
      setParsedMerchant(undefined);
      setParsedReference(undefined);
      setParsedDescription(undefined);
      setParsedReceiptType(undefined);
      setHealthDetails("");
    } catch (error) {
      console.error("Error loading image:", error);
      alert("Failed to load image. Please try again.");
    } finally {
      setProcessingPhoto(false);
    }
  };

  const handleScanReceipt = async () => {
    if (!photoDataUrl) return;
    setScanning(true);
    setScanProgress(0);
    setAccuracyConfirmed(null);
    try {
      const parsed = await scanReceiptImage(photoDataUrl, setScanProgress);

      // Log the scanned receipt data for debugging
      console.log('🛒 Receipt Scan Results:', {
        merchant: parsed.merchant,
        total: parsed.total,
        date: parsed.date,
        reference: parsed.reference,
        description: parsed.description,
        items: parsed.items,
        itemCount: parsed.items?.length || 0
      });

      setScannedItems(parsed.items);
      setParsedTotal(parsed.total ?? parsed.grossTotal ?? parsed.netTotal);
      setParsedDate(parsed.date);
      setParsedMerchant(parsed.merchant);
      setParsedReference(parsed.reference);
      setParsedDescription(parsed.description);
      setParsedReceiptType(parsed.receiptType);
      if (parsed.receiptType === "health") setCategoryId("health");
      if (parsed.receiptType === "fuel") {
        setCategoryId("fuel");
        setIsFuel(true);
      }

      if (parsed.total ?? parsed.grossTotal ?? parsed.netTotal) {
        const t = parsed.total ?? parsed.grossTotal ?? parsed.netTotal ?? 0;
        if (!amount) setAmount(String(t));
      }
      if (parsed.date) setDate(parsed.date);
      if (parsed.merchant) {
        setMerchant(parsed.merchant);
        setNote((n) => n || parsed.description || parsed.merchant || "");
        const suggested =
          parsed.receiptType === "health"
            ? "health"
            : parsed.receiptType === "grocery"
              ? "food"
              : suggestCategory(parsed.merchant);

        // Log category suggestion
        console.log('🏷️ Category Suggestion:', {
          merchant: parsed.merchant,
          suggestedCategory: suggested,
          isFuel: suggested === "fuel"
        });

        setCategoryId(suggested);
        setIsFuel(suggested === "fuel");
      }
      if (parsed.description && !note) setNote(parsed.description);
    } catch (err) {
      console.error("Scan failed:", err);
      setScannedItems([]);
      alert("Receipt scan failed. Please ensure the image is clear and try again.");
    } finally {
      setScanning(false);
    }
  };

  const updateScannedItem = (index: number, updates: Partial<ReceiptItem>) => {
    setScannedItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const removeScannedItem = (index: number) => {
    setScannedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const getPhotoForStorage = async (): Promise<string | undefined> => {
    if (!photoDataUrl) return undefined;
    if (photoDataUrl.length < 1_600_000) return photoDataUrl;
    try {
      // Keep receipt human-readable after save; OCR always uses original.
      return await resizeDataUrl(photoDataUrl, 1_100_000, 1400, 0.88);
    } catch {
      return undefined;
    }
  };

  const handleAddAllAsItemized = async () => {
    const photo = await getPhotoForStorage();
    const dateIso = new Date(date).toISOString();
    for (const item of scannedItems) {
      if (!item.name.trim() || item.amount <= 0) continue;
      const cat = item.categoryId ?? suggestCategory(item.name);
      const expenseData: Record<string, unknown> = {
        amount: item.amount,
        currency: "PKR",
        categoryId: cat,
        note: merchant ? `${item.name}${healthDetails ? ` • ${healthDetails}` : ""} • ${merchant}` : item.name.trim(),
        date: dateIso,
      };
      if (merchant) expenseData.merchant = merchant;
      if (parsedReference) expenseData.reference = parsedReference;
      if (photo) expenseData.photoDataUrl = photo;
      addExpense(expenseData as Parameters<typeof addExpense>[0]);
    }
    setScannedItems([]);
    setPhotoDataUrl(null);
    setParsedTotal(undefined);
    setParsedMerchant(undefined);
    setHealthDetails("");
    navigate("/");
  };

  const handleAddAsSingleExpense = async () => {
    const total = parsedTotal ?? scannedItems.reduce((s, i) => s + i.amount, 0);
    if (total <= 0) return;
    const photo = await getPhotoForStorage();
    const dateIso = parsedDate ? new Date(parsedDate + "T12:00:00").toISOString() : new Date(date).toISOString();
    const suggested = parsedMerchant ? suggestCategory(parsedMerchant) : categoryId;
    const expenseData: Record<string, unknown> = {
      amount: total,
      currency: "PKR",
      categoryId: suggested,
      note: [parsedDescription || note || parsedMerchant || "Receipt total", healthDetails].filter(Boolean).join(" • "),
      date: dateIso,
    };
    if (parsedMerchant) expenseData.merchant = parsedMerchant;
    if (parsedReference) expenseData.reference = parsedReference;
    if (photo) expenseData.photoDataUrl = photo;
    addExpense(expenseData as Parameters<typeof addExpense>[0]);
    setScannedItems([]);
    setPhotoDataUrl(null);
    setAmount("");
    setParsedTotal(undefined);
    setParsedMerchant(undefined);
    setHealthDetails("");
    navigate("/");
  };

  const getDuplicateHint = () => {
    const num = parseFloat(amount.replace(/,/g, ""));
    if (Number.isNaN(num) || num <= 0) return null;
    const d = new Date(date);
    const sameDay = expenses.filter(
      (e) => Math.abs(e.amount - num) < 0.01 && new Date(e.date).toDateString() === d.toDateString(),
    );
    return sameDay.length > 0 ? sameDay.length : null;
  };
  const duplicateCount = getDuplicateHint();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount.replace(/,/g, ""));
    if (Number.isNaN(num) || num <= 0) return;

    const photo = await getPhotoForStorage();
    const expenseData: Record<string, unknown> = {
      amount: num,
      currency: "PKR",
      categoryId: isFuel ? "fuel" : categoryId,
      note: [merchant, note.trim(), healthDetails.trim()].filter(Boolean).join(" • ") || note.trim(),
      date: new Date(date).toISOString(),
    };
    if (merchant) expenseData.merchant = merchant;
    if (parsedReference) expenseData.reference = parsedReference;
    if (photo) expenseData.photoDataUrl = photo;
    if (categoryId === "other" && customCategory.trim()) {
      expenseData.customCategory = customCategory.trim();
    }
    if (isFuel && (fuel.volumeLiters ?? fuel.odometerKm)) {
      expenseData.fuel = fuel;
    }

    setSaving(true);
    try {
      addExpense(expenseData as Parameters<typeof addExpense>[0]);
      setHealthDetails("");
      navigate("/");
    } finally {
      setSaving(false);
    }
  };

  const isFuelCategory = categoryId === "fuel";
  const hasScannedItems = scannedItems.length > 0;
  const hasScannedData = hasScannedItems || parsedMerchant || parsedTotal;
  const isHealthReceipt = parsedReceiptType === "health" || categoryId === "health";
  const isGroceryReceipt = parsedReceiptType === "grocery" || categoryId === "food" || categoryId === "shopping";
  const isUncategorized = categoryId === "other" && !customCategory.trim();
  const showUncategorizedWarning = hasScannedData && isUncategorized;

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-xl font-semibold mb-2">Add expense</h2>
      <p className="text-sm text-(--text-muted) mb-4">
        Upload receipt → Autoscan (OCR) → Review & save. Like Zoho Expense.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-(--text-muted) mb-1">
            📷 Receipt – Scan to auto-fill amount, date, merchant
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={handlePhotoClick}
            disabled={processingPhoto}
            className="w-full rounded-xl border-2 border-dashed border-(--border) p-4 flex flex-col items-center gap-2 text-(--text-muted) hover:border-(--accent) hover:text-(--accent) transition touch-manipulation min-h-20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {processingPhoto ? (
              <div className="flex flex-col items-center gap-2">
                <XlviLoader
                  boxColors={["var(--accent)", "#F59E0B", "#6366F1"]}
                  desktopSize="48px"
                  mobileSize="36px"
                />
                <span>Processing image...</span>
              </div>
            ) : photoDataUrl ? (
              <>
                <img
                  src={photoDataUrl}
                  alt="Receipt"
                  className="max-h-24 rounded-lg object-cover"
                />
                <span className="text-sm">Change photo</span>
              </>
            ) : (
              <>
                <span className="text-2xl">📷</span>
                <span className="text-sm">Tap to take or upload receipt</span>
              </>
            )}
          </button>
          {photoDataUrl && !hasScannedItems && (
            <button
              type="button"
              onClick={handleScanReceipt}
              disabled={scanning}
              className="mt-2 w-full py-2.5 rounded-xl bg-(--accent)/20 text-(--accent) font-medium border border-(--accent) hover:bg-(--accent)/30 transition touch-manipulation disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {scanning ? (
                <>
                  <XlviLoader boxColors={["var(--accent)"]} desktopSize="28px" mobileSize="22px" />
                  <span>Scanning… {Math.round(scanProgress * 100)}%</span>
                </>
              ) : (
                <>🔍 Autoscan receipt (OCR)</>
              )}
            </button>
          )}
        </div>

        {showUncategorizedWarning && (
          <div className="rounded-xl bg-amber-500/15 border border-amber-500/40 p-3 text-amber-700 dark:text-amber-400">
            <p className="font-medium">⚠️ This expense has not been categorized</p>
            <p className="text-sm mt-0.5">Please select a category or specify one under Other.</p>
          </div>
        )}

        {hasScannedData && (
          <div className="rounded-xl bg-(--surface) border border-(--border) p-3">
            <p className="text-sm font-medium mb-2">Is the autoscanned expense accurate?</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAccuracyConfirmed(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  accuracyConfirmed === true
                    ? "bg-green-500/20 text-green-600 border border-green-500/50"
                    : "bg-(--surface-hover) border border-(--border)"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setAccuracyConfirmed(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  accuracyConfirmed === false
                    ? "bg-amber-500/20 text-amber-600 border border-amber-500/50"
                    : "bg-(--surface-hover) border border-(--border)"
                }`}
              >
                No – I'll correct it
              </button>
            </div>
          </div>
        )}

        {hasScannedItems && (
          <div className="rounded-xl bg-(--surface) border border-(--border) p-4 space-y-3">
            <h3 className="font-medium">📋 Smart scan – Auto-categorized items</h3>
            {(parsedMerchant || parsedTotal || parsedDate || parsedReference) && (
              <div className="text-xs text-(--text-muted) space-y-0.5">
                {parsedMerchant && <p>Merchant: {parsedMerchant}</p>}
                {parsedTotal != null && <p>Amount: {formatPkr(parsedTotal)}</p>}
                {parsedDate && <p>Date: {format(new Date(parsedDate + "T12:00:00"), "dd MMM yyyy")}</p>}
                {parsedReference && <p>Ref#: {parsedReference}</p>}
              </div>
            )}
            {isGroceryReceipt && (
              <div className="rounded-lg bg-(--bg) border border-(--border) p-3">
                <p className="text-sm font-medium mb-2">🛒 Grocery item summary</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {scannedItems.map((item, i) => (
                    <li key={`bullet-${i}`}>
                      {item.name}
                      {item.quantity ? ` • Qty: ${item.quantity}` : ""}
                      {item.unitPrice ? ` • Unit: Rs ${item.unitPrice.toFixed(2)}` : ""}
                      {` • Total: Rs ${item.amount.toFixed(2)}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {scannedItems.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 flex-wrap gap-y-1"
                >
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateScannedItem(i, { name: e.target.value })}
                    className="flex-1 min-w-[80px] px-2 py-1.5 rounded-lg bg-(--bg) border border-(--border) text-sm"
                    placeholder="Item"
                  />
                  <select
                    value={item.categoryId ?? "other"}
                    onChange={(e) => updateScannedItem(i, { categoryId: e.target.value as CategoryId })}
                    className="px-2 py-1.5 rounded-lg bg-(--bg) border border-(--border) text-sm max-w-[130px]"
                  >
                    {categories.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                      >
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => updateScannedItem(i, { amount: parseFloat(e.target.value) || 0 })}
                    className="w-20 px-2 py-1.5 rounded-lg bg-(--bg) border border-(--border) text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity ?? ""}
                    onChange={(e) =>
                      updateScannedItem(i, { quantity: e.target.value ? parseFloat(e.target.value) : undefined })
                    }
                    className="w-16 px-2 py-1.5 rounded-lg bg-(--bg) border border-(--border) text-sm"
                    placeholder="Qty"
                  />
                  <span className="text-xs text-(--text-muted) w-6">Rs</span>
                  <button
                    type="button"
                    onClick={() => removeScannedItem(i)}
                    className="p-1.5 rounded-lg text-(--danger) hover:bg-(--danger)/10"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-sm text-(--text-muted)">
              Total: {formatPkr(scannedItems.reduce((s, i) => s + i.amount, 0))}
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAddAllAsItemized}
                className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-(--accent) text-white font-medium hover:opacity-90 transition"
              >
                Add {scannedItems.length} as items
              </button>
              <button
                type="button"
                onClick={handleAddAsSingleExpense}
                className="flex-1 min-w-[120px] py-2.5 rounded-xl border border-(--accent) text-(--accent) font-medium hover:bg-(--accent)/10 transition"
              >
                Add as 1 expense
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-(--text-muted) mb-1">Amount (Rs)</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-(--surface) border border-(--border) text-lg touch-manipulation"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-(--text-muted) mb-1">Category</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategoryId(c.id);
                  setIsFuel(c.id === "fuel");
                }}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-sm transition touch-manipulation min-h-16 ${
                  categoryId === c.id
                    ? "border-(--accent) bg-(--accent)/10"
                    : "border-(--border) bg-(--surface) hover:bg-(--surface-hover)"
                }`}
              >
                <span className="text-xl">{c.icon}</span>
                <span className="truncate w-full text-center">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {categoryId === "other" && (
          <div>
            <label className="block text-sm font-medium text-(--text-muted) mb-1">Specify category (optional)</label>
            <input
              type="text"
              placeholder="e.g. Gifts, Donations, Repairs..."
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-(--surface) border border-(--border)"
            />
          </div>
        )}

        {(isFuelCategory || isFuel) && (
          <div className="rounded-xl bg-(--surface) border border-(--fuel)/30 p-4 space-y-3">
            <h3 className="font-medium text-(--fuel)">⛽ Fuel details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-(--text-muted)">Volume (L)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={fuel.volumeLiters ?? ""}
                  onChange={(e) =>
                    setFuel((f) => ({
                      ...f,
                      volumeLiters: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-(--bg) border border-(--border)"
                />
              </div>
              <div>
                <label className="block text-xs text-(--text-muted)">Price/L (Rs)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={fuel.pricePerLiter ?? ""}
                  onChange={(e) =>
                    setFuel((f) => ({
                      ...f,
                      pricePerLiter: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-(--bg) border border-(--border)"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-(--text-muted)">Odometer (km)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={fuel.odometerKm ?? ""}
                  onChange={(e) =>
                    setFuel((f) => ({
                      ...f,
                      odometerKm: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-(--bg) border border-(--border)"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-(--text-muted)">Fuel type</label>
                <select
                  value={fuel.fuelType ?? "petrol"}
                  onChange={(e) =>
                    setFuel((f) => ({
                      ...f,
                      fuelType: e.target.value as FuelInfo["fuelType"],
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-(--bg) border border-(--border)"
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

        {isHealthReceipt && (
          <div className="rounded-xl bg-(--surface) border border-red-400/40 p-4 space-y-2">
            <h3 className="font-medium text-red-500">💊 Medicine / Health details</h3>
            <input
              type="text"
              placeholder="e.g. BP medicine, antibiotics, monthly refill"
              value={healthDetails}
              onChange={(e) => setHealthDetails(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-(--bg) border border-(--border)"
            />
            <p className="text-xs text-(--text-muted)">
              This field appears only for health/medical receipts and will be saved in the note.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-(--text-muted) mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-(--surface) border border-(--border) touch-manipulation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-(--text-muted) mb-1">Merchant / Store</label>
          <input
            type="text"
            placeholder="e.g. KFC, Shell Pump, Mart"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-(--surface) border border-(--border)"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-(--text-muted) mb-1">Description / Note</label>
          <textarea
            placeholder="e.g. first item or receipt details"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-(--surface) border border-(--border) resize-none"
          />
          {parsedReference && (
            <p className="text-xs text-(--text-muted) mt-1">Ref#: {parsedReference}</p>
          )}
        </div>

        {duplicateCount != null && duplicateCount > 0 && (
          <p className="text-sm text-amber-500">
            ⚠️ {duplicateCount} similar expense{duplicateCount > 1 ? "s" : ""} on this date.
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl bg-(--accent) text-white font-medium hover:opacity-90 transition touch-manipulation min-h-12 disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <XlviLoader
                boxColors={["#fff"]}
                desktopSize="24px"
                mobileSize="20px"
              />
              <span>Saving...</span>
            </>
          ) : (
            "Save expense"
          )}
        </button>
      </form>
    </div>
  );
}

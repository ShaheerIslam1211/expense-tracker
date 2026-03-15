import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { XlviLoader } from "react-awesome-loaders";
import { useExpenses } from "../context/ExpenseContext";
import { useCategories } from "../context/CategoryContext";
import { AppLoader } from "../components/AppLoader";
import { type CategoryId, type FuelInfo, type PaymentMethodType, type ExpenseAdvancedDetails } from "../types";
import { useCards } from "../context/CardContext";
import { useToast } from "../context/ToastContext";
import { resizeImage, needsResizing, resizeDataUrl } from "../utils/imageResize";
import { DETAIL_SUBCATEGORY_OPTIONS, FOOD_ITEM_TYPES, LAB_TEST_OPTIONS, buildDetailsSummary } from "../utils/expenseDetails";

export default function EditExpense() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { expenses, updateExpense } = useExpenses();
  const { categories } = useCategories();
  const { cards } = useCards();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const expense = expenses.find((e) => e.id === id);

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<CategoryId>("other");
  const [customCategory, setCustomCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethodType, setPaymentMethodType] = useState<PaymentMethodType>("cash");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isFuel, setIsFuel] = useState(false);
  const [fuel, setFuel] = useState<FuelInfo>({
    volumeLiters: undefined,
    pricePerLiter: undefined,
    odometerKm: undefined,
    fuelType: "petrol",
  });
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState<ExpenseAdvancedDetails>({});
  const detailReportInputRef = useRef<HTMLInputElement>(null);

  const updateDetails = (updates: Partial<ExpenseAdvancedDetails>) => {
    setDetails((prev) => ({ ...prev, ...updates }));
  };

  const toggleLabTest = (testValue: string) => {
    setDetails((prev) => {
      const current = prev.labTests ?? [];
      const exists = current.includes(testValue);
      return {
        ...prev,
        labTests: exists ? current.filter((t) => t !== testValue) : [...current, testValue],
      };
    });
  };

  const supportsAdvancedDetails = Boolean(DETAIL_SUBCATEGORY_OPTIONS[categoryId]?.length);
  const isFoodGrocery = categoryId === "food" && details.subCategory === "groceries";
  const isCookingOil = isFoodGrocery && details.itemType === "cooking-oil";
  const isHealthInsulin = categoryId === "health" && (details.subCategory?.startsWith("insulin") ?? false);
  const isHealthLabTest = categoryId === "health" && details.subCategory === "lab-test";
  const isBillsMobilePackage = categoryId === "bills" && details.subCategory === "mobile-package";
  const isDadInspectorVisit = categoryId === "dad" && details.subCategory === "inspector-visit";
  const isTransportRideApp = categoryId === "transport" && ["indrive", "yango", "uber-careem"].includes(details.subCategory ?? "");

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount));
      setCategoryId(expense.categoryId);
      setCustomCategory(expense.customCategory ?? "");
      setNote(expense.note);
      setDate(format(parseISO(expense.date), "yyyy-MM-dd"));
      setPaymentMethodType(expense.paymentMethodType || "cash");
      setPaymentMethodId(expense.paymentMethodId || "");
      setPhotoDataUrl(expense.photoDataUrl ?? null);
      setIsFuel(expense.categoryId === "fuel");
      setDetails(expense.details ?? {});
      setFuel(
        expense.fuel ?? {
          volumeLiters: undefined,
          pricePerLiter: undefined,
          odometerKm: undefined,
          fuelType: "petrol",
        },
      );
    }
  }, [expense]);

  useEffect(() => {
    const options = DETAIL_SUBCATEGORY_OPTIONS[categoryId] ?? [];
    if (options.length === 0) {
      if (Object.keys(details).length > 0) setDetails({});
      return;
    }
    if (!details.subCategory || !options.some((option) => option.value === details.subCategory)) {
      setDetails((prev) => ({ ...prev, subCategory: options[0].value }));
    }
  }, [categoryId, details]);

  const handleDetailReportUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
            if (file.size > 550 * 1024) throw new Error(`${file.name} is too large.`);
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            return { name: file.name, mimeType: file.type, dataUrl };
          }
          throw new Error(`${file.name} unsupported`);
        }),
      );
      setDetails((prev) => ({
        ...prev,
        reports: [...(prev.reports ?? []), ...uploaded].slice(0, 5),
      }));
      showToast("Test report uploaded", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      showToast(message, "error");
    } finally {
      event.target.value = "";
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    setProcessingPhoto(true);
    try {
      const dataUrl = needsResizing(file)
        ? await resizeImage(file)
        : await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
      setPhotoDataUrl(dataUrl);
    } catch (err) {
      console.error(err);
      alert("Failed to process image.");
    } finally {
      setProcessingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !expense) return;

    const num = parseFloat(amount.replace(/,/g, ""));
    if (Number.isNaN(num) || num <= 0) return;

    const normalizedDetails: ExpenseAdvancedDetails = {
      ...Object.fromEntries(Object.entries(details).filter(([, value]) => typeof value === "string" && value.trim().length > 0)),
      ...(details.labTests?.length ? { labTests: details.labTests } : {}),
      ...(details.reports?.length ? { reports: details.reports } : {}),
    };
    const detailSummary = buildDetailsSummary(normalizedDetails);

    const updates: Record<string, unknown> = {
      amount: num,
      categoryId: isFuel ? "fuel" : categoryId,
      note: [note.trim(), detailSummary].filter(Boolean).join(" • "),
      date: new Date(date).toISOString(),
      paymentMethodType,
      paymentMethodId: paymentMethodType === "card" ? paymentMethodId : undefined,
    };

    if (photoDataUrl) updates.photoDataUrl = photoDataUrl;
    if (categoryId === "other" && customCategory.trim()) {
      updates.customCategory = customCategory.trim();
    } else if (categoryId !== "other") {
      updates.customCategory = undefined;
    }
    if (isFuel && (fuel.volumeLiters ?? fuel.odometerKm)) {
      updates.fuel = fuel;
    } else if (!isFuel) {
      updates.fuel = undefined;
    }
    if (supportsAdvancedDetails && Object.keys(normalizedDetails).length > 0) {
      updates.details = normalizedDetails;
    } else {
      updates.details = undefined;
    }

    setSaving(true);
    try {
      await updateExpense(id, updates as Partial<typeof expense>);
      showToast("Expense updated successfully", "success");
      navigate("/history");
    } catch (error) {
      console.error("Failed to update expense:", error);
      showToast("Failed to update expense. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const isFuelCategory = categoryId === "fuel";

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <AppLoader className="min-h-[20vh]" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--danger)] mb-4">Expense not found.</p>
        <button
          type="button"
          onClick={() => navigate("/history")}
          className="px-4 py-2 rounded-lg bg-[var(--surface-hover)]"
        >
          Back to History
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Edit expense</h2>
        <button
          type="button"
          onClick={() => navigate("/history")}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)]"
        >
          Cancel
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Amount (Rs)</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Category</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategoryId(c.id);
                  setIsFuel(c.id === "fuel");
                  setDetails({});
                }}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-sm transition min-h-16 ${
                  categoryId === c.id
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
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
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              Specify category (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Gifts, Donations, Repairs..."
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
            />
          </div>
        )}

        {supportsAdvancedDetails && (
          <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4 space-y-3">
            <h3 className="font-medium">Advanced category details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={details.subCategory ?? ""}
                onChange={(e) =>
                  updateDetails({
                    subCategory: e.target.value,
                    itemType: undefined,
                    dosagePlan: undefined,
                    quantity: undefined,
                    unit: undefined,
                    packageType: undefined,
                    inspectionType: undefined,
                    routeType: undefined,
                    labTests: undefined,
                    customLabTest: undefined,
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
              >
                {(DETAIL_SUBCATEGORY_OPTIONS[categoryId] ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {(categoryId === "food" || categoryId === "shopping" || categoryId === "health") && (
                <select
                  value={details.itemType ?? ""}
                  onChange={(e) => updateDetails({ itemType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
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
                    </>
                  )}
                  {categoryId === "health" && (
                    <>
                      <option value="apidra">Apidra</option>
                      <option value="lantus">Lantus</option>
                      <option value="apidra-lantus">Apidra + Lantus</option>
                      <option value="test-strips">Test Strips</option>
                    </>
                  )}
                </select>
              )}

              {isCookingOil && (
                <>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={details.quantity ?? ""}
                    onChange={(e) => updateDetails({ quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                    placeholder="Oil quantity"
                  />
                  <select
                    value={details.unit ?? "litre"}
                    onChange={(e) => updateDetails({ unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                  >
                    <option value="litre">Litre</option>
                    <option value="ml">Millilitre</option>
                  </select>
                </>
              )}

              {isBillsMobilePackage && (
                <select
                  value={details.packageType ?? ""}
                  onChange={(e) => updateDetails({ packageType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                >
                  <option value="">Select package</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="postpaid">Postpaid</option>
                </select>
              )}

              {isDadInspectorVisit && (
                <select
                  value={details.inspectionType ?? ""}
                  onChange={(e) => updateDetails({ inspectionType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                >
                  <option value="">Inspection type</option>
                  <option value="property">Property Check</option>
                  <option value="utility">Utility Check</option>
                  <option value="document">Document Verification</option>
                </select>
              )}

              {isTransportRideApp && (
                <select
                  value={details.routeType ?? ""}
                  onChange={(e) => updateDetails({ routeType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                >
                  <option value="">Route type</option>
                  <option value="one-way">One Way</option>
                  <option value="round-trip">Round Trip</option>
                  <option value="within-city">Within City</option>
                  <option value="inter-city">Inter City</option>
                </select>
              )}

              {(categoryId === "dad" || categoryId === "bills" || categoryId === "transport" || categoryId === "utilities") && (
                <input
                  type="text"
                  value={details.provider ?? ""}
                  onChange={(e) => updateDetails({ provider: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                  placeholder="Provider / source"
                />
              )}
            </div>

            {isHealthInsulin && (
              <select
                value={details.dosagePlan ?? ""}
                onChange={(e) => updateDetails({ dosagePlan: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
              >
                <option value="">Dosage plan</option>
                <option value="once-daily">Once Daily</option>
                <option value="twice-daily">Twice Daily</option>
                <option value="as-needed">As Needed</option>
              </select>
            )}

            {isHealthLabTest && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Lab tests (select multiple)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LAB_TEST_OPTIONS.map((test) => {
                    const active = details.labTests?.includes(test.value) ?? false;
                    return (
                      <button
                        key={test.value}
                        type="button"
                        onClick={() => toggleLabTest(test.value)}
                        className={`px-3 py-2 rounded-lg border text-left text-sm ${
                          active
                            ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                            : "border-[var(--border)] bg-[var(--bg)]"
                        }`}
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
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                  placeholder="Custom lab test (optional)"
                />
              </div>
            )}

            {categoryId === "health" && (
              <div className="space-y-2">
                <input
                  ref={detailReportInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleDetailReportUpload}
                />
                <button
                  type="button"
                  onClick={() => detailReportInputRef.current?.click()}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm"
                >
                  Upload test report (PDF/photo)
                </button>
                {(details.reports?.length ?? 0) > 0 && (
                  <div className="space-y-1">
                    {details.reports?.map((report, index) => (
                      <div key={`${report.name}-${index}`} className="flex items-center justify-between text-sm">
                        <span className="truncate pr-2">
                          {report.mimeType === "application/pdf" ? "PDF" : "Image"} - {report.name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setDetails((prev) => ({
                              ...prev,
                              reports: (prev.reports ?? []).filter((_, i) => i !== index),
                            }))
                          }
                          className="text-[var(--danger)]"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Payment Method</label>
          <div className="flex gap-3 mb-3">
            <button
              type="button"
              onClick={() => setPaymentMethodType("cash")}
              className={`flex-1 py-3 rounded-xl border text-sm font-medium transition touch-manipulation flex items-center justify-center gap-2 ${
                paymentMethodType === "cash"
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              <span>💵</span> Cash
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentMethodType("card");
                if (cards.length > 0 && !paymentMethodId) {
                  setPaymentMethodId(cards[0].id);
                }
              }}
              className={`flex-1 py-3 rounded-xl border text-sm font-medium transition touch-manipulation flex items-center justify-center gap-2 ${
                paymentMethodType === "card"
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              <span>💳</span> Card
            </button>
          </div>

          {paymentMethodType === "card" && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              {cards.length > 0 ? (
                <select
                  value={paymentMethodId}
                  onChange={(e) => setPaymentMethodId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm"
                  required
                >
                  <option
                    value=""
                    disabled
                  >
                    Select a card
                  </option>
                  {cards.map((card) => (
                    <option
                      key={card.id}
                      value={card.id}
                    >
                      {card.bankName} - {card.cardNumber.slice(-4)} ({card.cardHolderName})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-sm">
                  No cards found. Please{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/cards")}
                    className="underline font-bold"
                  >
                    add a card
                  </button>{" "}
                  first.
                </div>
              )}
            </div>
          )}
        </div>

        {(isFuelCategory || isFuel) && (
          <div className="rounded-xl bg-[var(--surface)] border border-[var(--fuel)]/30 p-4 space-y-3">
            <h3 className="font-medium text-[var(--fuel)]">⛽ Fuel details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)]">Volume (L)</label>
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
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)]">Price/L (Rs)</label>
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
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-[var(--text-muted)]">Odometer (km)</label>
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
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-[var(--text-muted)]">Fuel type</label>
                <select
                  value={fuel.fuelType ?? "petrol"}
                  onChange={(e) =>
                    setFuel((f) => ({
                      ...f,
                      fuelType: e.target.value as FuelInfo["fuelType"],
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
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

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Note</label>
          <textarea
            placeholder="Optional note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Receipt photo</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={processingPhoto}
            className="w-full rounded-xl border-2 border-dashed border-[var(--border)] p-6 flex flex-col items-center gap-2 text-[var(--text-muted)] hover:border-[var(--accent)] disabled:opacity-60"
          >
            {processingPhoto ? (
              <div className="flex flex-col items-center gap-2">
                <XlviLoader
                  boxColors={["var(--accent)"]}
                  desktopSize="48px"
                  mobileSize="36px"
                />
                <span>Processing...</span>
              </div>
            ) : photoDataUrl ? (
              <>
                <img
                  src={photoDataUrl}
                  alt="Receipt"
                  className="max-h-32 rounded-lg object-cover"
                />
                <span className="text-sm">Change photo</span>
              </>
            ) : (
              <>
                <span className="text-3xl">📷</span>
                <span>Tap to add or change receipt</span>
              </>
            )}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate("/history")}
            className="flex-1 py-3 rounded-xl border border-[var(--border)] font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <XlviLoader
                  boxColors={["#fff"]}
                  desktopSize="24px"
                  mobileSize="20px"
                />
                <span>Updating...</span>
              </>
            ) : (
              "Update expense"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

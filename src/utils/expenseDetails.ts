import type { ExpenseAdvancedDetails } from "../types";

export interface DetailOption {
  value: string;
  label: string;
}

export const DETAIL_SUBCATEGORY_OPTIONS: Record<string, DetailOption[]> = {
  food: [
    { value: "groceries", label: "Groceries" },
    { value: "restaurant", label: "Restaurant / Dining Out" },
    { value: "bakery", label: "Bakery / Snacks" },
    { value: "household", label: "Household Supplies" },
  ],
  dad: [
    { value: "personal-shopping", label: "Personal Shopping" },
    { value: "courier-charges", label: "Courier Charges" },
    { value: "inspector-visit", label: "Inspector Visit Charges" },
    { value: "medicine-support", label: "Medicine / Health Support" },
    { value: "utility-support", label: "Utility Support" },
  ],
  bills: [
    { value: "electricity", label: "Electricity Bill" },
    { value: "water", label: "Water Bill" },
    { value: "gas", label: "Gas Bill" },
    { value: "internet", label: "Internet Bill" },
    { value: "icloud", label: "iCloud Bill" },
    { value: "netflix", label: "Netflix" },
    { value: "mobile-package", label: "Mobile Package" },
  ],
  shopping: [
    { value: "clothes", label: "Clothes" },
    { value: "footwear", label: "Footwear" },
    { value: "electronics", label: "Electronics" },
    { value: "home-items", label: "Home Items" },
    { value: "beauty", label: "Beauty / Personal Care" },
    { value: "gifts", label: "Gifts" },
  ],
  health: [
    { value: "insulin-apidra", label: "Insulin - Apidra" },
    { value: "insulin-lantus", label: "Insulin - Lantus" },
    { value: "insulin-both", label: "Insulin - Apidra + Lantus" },
    { value: "sugar-medicine", label: "Sugar Medicine" },
    { value: "test-strips", label: "Test Strips" },
    { value: "normal-medicine", label: "Normal Medicine" },
    { value: "doctor-visit", label: "Doctor Visit" },
    { value: "lab-test", label: "Lab Test" },
  ],
  transport: [
    { value: "public-local", label: "Public Local" },
    { value: "indrive", label: "InDrive" },
    { value: "yango", label: "Yango" },
    { value: "uber-careem", label: "Uber / Careem" },
    { value: "parking", label: "Parking" },
    { value: "toll", label: "Toll Charges" },
  ],
  utilities: [
    { value: "electricity", label: "Electricity" },
    { value: "water", label: "Water" },
    { value: "gas", label: "Gas" },
    { value: "internet", label: "Internet" },
    { value: "mobile", label: "Mobile Recharge" },
    { value: "maintenance", label: "Maintenance / Repair" },
    { value: "cleaning", label: "Cleaning / Supplies" },
  ],
};

export const FOOD_ITEM_TYPES: DetailOption[] = [
  { value: "surf", label: "Surf / Detergent" },
  { value: "milk", label: "Milk" },
  { value: "soap", label: "Soap" },
  { value: "cooking-oil", label: "Cooking Oil" },
  { value: "flour", label: "Flour" },
  { value: "rice", label: "Rice" },
  { value: "other-grocery", label: "Other Grocery" },
];

export const LAB_TEST_OPTIONS: DetailOption[] = [
  { value: "cbc", label: "CBC" },
  { value: "fasting-sugar", label: "Fasting Sugar" },
  { value: "random-sugar", label: "Random Sugar" },
  { value: "hba1c", label: "HbA1c" },
  { value: "lipid-profile", label: "Lipid Profile" },
  { value: "lft", label: "LFT" },
  { value: "kft", label: "KFT" },
  { value: "urine-routine", label: "Urine Routine" },
  { value: "thyroid", label: "Thyroid Panel" },
  { value: "vitamin-d", label: "Vitamin D" },
  { value: "vitamin-b12", label: "Vitamin B12" },
];

export function buildDetailsSummary(details: ExpenseAdvancedDetails) {
  const labTestLabels =
    details.labTests?.map((value) => LAB_TEST_OPTIONS.find((option) => option.value === value)?.label ?? value) ?? [];
  const parts = [
    details.subCategory,
    details.itemType,
    details.variant,
    details.provider,
    details.billType,
    details.packageType,
    details.quantity && details.unit ? `${details.quantity} ${details.unit}` : details.quantity,
    labTestLabels.length ? `Tests: ${labTestLabels.join(", ")}` : "",
    details.customLabTest,
  ].filter(Boolean);
  return parts.join(" • ");
}

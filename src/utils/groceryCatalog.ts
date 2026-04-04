import type { DetailOption } from "./expenseDetails";

export interface GroceryGroup {
  id: string;
  label: string;
  items: DetailOption[];
}

/** Preset grocery & household items (multi-select). Use `custom:Your text` for anything else. */
export const GROCERY_CATALOG: GroceryGroup[] = [
  {
    id: "detergent-cleaning",
    label: "Detergent & cleaning",
    items: [
      { value: "surf", label: "Surf / washing powder" },
      { value: "ariel", label: "Ariel" },
      { value: "vim", label: "Vim (general)" },
      { value: "vim-dishwash", label: "Vim dish wash" },
      { value: "harpic", label: "Harpic / toilet cleaner" },
      { value: "bleach", label: "Bleach / disinfectant" },
      { value: "floor-cleaner", label: "Floor cleaner" },
      { value: "glass-cleaner", label: "Glass cleaner" },
      { value: "dish-soap-liquid", label: "Dish washing liquid" },
      { value: "sponge-scrub", label: "Sponge / scrub" },
      { value: "tissue-roll", label: "Tissue roll" },
      { value: "garbage-bags", label: "Garbage bags" },
    ],
  },
  {
    id: "personal-care",
    label: "Personal care",
    items: [
      { value: "soap", label: "Soap / body soap" },
      { value: "body-wash", label: "Body wash / shower gel" },
      { value: "toothpaste", label: "Toothpaste" },
      { value: "toothbrush", label: "Toothbrush" },
      { value: "shampoo", label: "Shampoo" },
      { value: "conditioner", label: "Conditioner" },
      { value: "lotion-cream", label: "Body lotion / cream" },
      { value: "deodorant", label: "Deodorant" },
      { value: "razor-blades", label: "Razor / blades" },
      { value: "sanitary-pads", label: "Sanitary pads" },
      { value: "face-wash", label: "Face wash" },
    ],
  },
  {
    id: "pulses-grains",
    label: "Pulses, rice & flour",
    items: [
      { value: "dal-mong", label: "Daal moong / mong" },
      { value: "dal-masar", label: "Daal masoor / masar" },
      { value: "dal-chana", label: "Daal chana" },
      { value: "chana-whole", label: "Chana (whole)" },
      { value: "lobia", label: "Lobia / black-eyed peas" },
      { value: "rice-basmati", label: "Rice basmati" },
      { value: "rice-sella", label: "Rice sella / parboiled" },
      { value: "rice-irri", label: "Rice IRRI / local" },
      { value: "atta", label: "Atta / wheat flour" },
      { value: "maida", label: "Maida" },
      { value: "besan", label: "Besan" },
      { value: "suji", label: "Suji / semolina" },
      { value: "oats", label: "Oats" },
    ],
  },
  {
    id: "spices-masala",
    label: "Spices & masala",
    items: [
      { value: "cardamom", label: "Cardamom (elaichi)" },
      { value: "black-pepper", label: "Black pepper" },
      { value: "red-chilli-powder", label: "Red chilli powder" },
      { value: "turmeric", label: "Turmeric (haldi)" },
      { value: "cumin-whole", label: "Cumin seeds (sabut zeera)" },
      { value: "cumin-powder", label: "Cumin powder" },
      { value: "coriander-powder", label: "Coriander powder" },
      { value: "garam-masala", label: "Garam masala" },
      { value: "chaat-masala", label: "Chaat masala" },
      { value: "salt", label: "Salt" },
      { value: "sugar", label: "Sugar" },
      { value: "tea-leaves", label: "Tea leaves" },
      { value: "coffee", label: "Coffee" },
    ],
  },
  {
    id: "oil-ghee",
    label: "Oil & ghee",
    items: [
      { value: "cooking-oil", label: "Cooking oil (general)" },
      { value: "oil-sunflower", label: "Sunflower oil" },
      { value: "oil-canola", label: "Canola / vegetable oil" },
      { value: "oil-olive", label: "Olive oil" },
      { value: "oil-mustard", label: "Mustard oil" },
      { value: "ghee", label: "Ghee" },
    ],
  },
  {
    id: "snacks-bakery",
    label: "Snacks & bakery",
    items: [
      { value: "biscuits", label: "Biscuits" },
      { value: "cake", label: "Cake / bakery cake" },
      { value: "chips-lays", label: "Chips — Lays" },
      { value: "chips-wavy", label: "Chips — Wavy / other" },
      { value: "nimko", label: "Nimko / mix nimco" },
      { value: "halwa-sooji", label: "Halwa mix / sooji sweet" },
      { value: "chocolates", label: "Chocolates" },
      { value: "candy", label: "Candy / toffees" },
    ],
  },
  {
    id: "bottles-drinks",
    label: "Bottled water & drinks",
    items: [
      { value: "water-bottle-500ml", label: "Water bottle 500 ml" },
      { value: "water-bottle-1l", label: "Water bottle 1 L" },
      { value: "water-bottle-1p5l", label: "Water bottle 1.5 L" },
      { value: "water-bottle-2l", label: "Water bottle 2 L" },
      { value: "soft-drink", label: "Soft drink / soda" },
      { value: "juice-pack", label: "Juice (pack / bottle)" },
      { value: "energy-drink", label: "Energy drink" },
    ],
  },
  {
    id: "dairy",
    label: "Dairy",
    items: [
      { value: "milk", label: "Milk" },
      { value: "milk-powder", label: "Milk powder" },
      { value: "yogurt-dahi", label: "Yogurt / dahi" },
      { value: "butter", label: "Butter" },
      { value: "cheese", label: "Cheese" },
      { value: "cream", label: "Cream / malai" },
      { value: "khoya", label: "Khoya" },
    ],
  },
  {
    id: "meat-eggs",
    label: "Meat & eggs",
    items: [
      { value: "chicken-1kg", label: "Chicken ~1 kg" },
      { value: "chicken-2kg", label: "Chicken ~2 kg" },
      { value: "chicken-pieces", label: "Chicken (pieces / tray)" },
      { value: "beef", label: "Beef" },
      { value: "mutton", label: "Mutton / lamb" },
      { value: "fish", label: "Fish" },
      { value: "eggs", label: "Eggs (dozen / tray)" },
      { value: "frozen-nuggets", label: "Frozen nuggets / fingers" },
    ],
  },
  {
    id: "baby",
    label: "Baby & child",
    items: [
      { value: "pampers", label: "Pampers / diapers" },
      { value: "baby-wipes", label: "Baby wipes" },
      { value: "baby-food", label: "Baby food / cereal" },
      { value: "baby-lotion", label: "Baby lotion / powder" },
      { value: "baby-shampoo", label: "Baby shampoo" },
    ],
  },
  {
    id: "nuts-dry",
    label: "Nuts & dry fruit",
    items: [
      { value: "almonds-1kg", label: "Almonds 1 kg" },
      { value: "almonds-2kg", label: "Almonds 2 kg" },
      { value: "almonds-small", label: "Almonds (small pack)" },
      { value: "cashews", label: "Cashews / kaju" },
      { value: "walnuts", label: "Walnuts" },
      { value: "peanuts", label: "Peanuts / moongphali" },
      { value: "dates", label: "Dates (khajoor)" },
      { value: "raisins", label: "Raisins / kishmish" },
    ],
  },
  {
    id: "frozen-canned",
    label: "Frozen & canned",
    items: [
      { value: "frozen-paratha", label: "Frozen paratha / roti" },
      { value: "frozen-vegetables", label: "Frozen vegetables" },
      { value: "canned-tomato", label: "Canned tomato / puree" },
      { value: "baked-beans", label: "Baked beans / canned" },
    ],
  },
  {
    id: "vegetables-fruits",
    label: "Fresh vegetables & fruit",
    items: [
      { value: "veg-potato", label: "Potato" },
      { value: "veg-onion", label: "Onion" },
      { value: "veg-tomato", label: "Tomato" },
      { value: "veg-mixed", label: "Mixed vegetables" },
      { value: "fruit-banana", label: "Banana" },
      { value: "fruit-apple", label: "Apple" },
      { value: "fruit-seasonal", label: "Seasonal fruit (other)" },
    ],
  },
  {
    id: "misc",
    label: "Misc & household",
    items: [
      { value: "matches-lighter", label: "Matches / lighter" },
      { value: "candles", label: "Candles" },
      { value: "batteries", label: "Batteries" },
      { value: "foil-wrap", label: "Foil / cling wrap" },
      { value: "tea-strainer", label: "Kitchen small tools" },
      { value: "air-freshener", label: "Air freshener" },
    ],
  },
];

const lookup = new Map<string, string>();
for (const g of GROCERY_CATALOG) {
  for (const it of g.items) {
    lookup.set(it.value, it.label);
  }
}

export function getGroceryItemLabel(value: string): string {
  if (value.startsWith("custom:")) return value.slice(7).trim() || "Custom item";
  return lookup.get(value) ?? value.replace(/-/g, " ");
}

export function formatGroceryItemsSummary(items: string[] | undefined): string {
  if (!items?.length) return "";
  return items.map(getGroceryItemLabel).join(", ");
}

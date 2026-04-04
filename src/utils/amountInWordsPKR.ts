/** English words for whole PKR amounts (lakh / crore grouping). */

const UNDER_TWENTY = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function under1000(n: number): string {
  if (n < 20) return UNDER_TWENTY[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o ? `${TENS[t]} ${UNDER_TWENTY[o]}` : TENS[t];
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const head = `${UNDER_TWENTY[h]} hundred`;
  return rest ? `${head} ${under1000(rest)}` : head;
}

/**
 * e.g. 1000 → "One thousand rupees"; 40000 → "Forty thousand rupees".
 */
export function amountInWordsPKR(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return "";
  const n = Math.floor(amount);
  if (n === 0) return "Zero rupees";

  const parts: string[] = [];
  let remaining = n;

  if (remaining >= 10_000_000) {
    const c = Math.floor(remaining / 10_000_000);
    parts.push(`${under1000(c)} crore`);
    remaining %= 10_000_000;
  }
  if (remaining >= 100_000) {
    const l = Math.floor(remaining / 100_000);
    parts.push(`${under1000(l)} lakh`);
    remaining %= 100_000;
  }
  if (remaining >= 1000) {
    const t = Math.floor(remaining / 1000);
    parts.push(`${under1000(t)} thousand`);
    remaining %= 1000;
  }
  if (remaining > 0) {
    parts.push(under1000(remaining));
  }

  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
  return `${capitalized} rupees`;
}

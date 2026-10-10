const CURRENCY_PATTERN = /^[A-Za-z]{3}$/;

/** True when Intl can format the given three-letter currency code. */
export function isValidCurrencyCode(value: unknown): value is string {
  if (typeof value !== "string" || !CURRENCY_PATTERN.test(value)) return false;
  try {
    new Intl.NumberFormat("en-US", { style: "currency", currency: value });
    return true;
  } catch {
    return false;
  }
}

/** Trims and upper-cases a currency code for storage and display. */
export function normalizeCurrency(value: string): string {
  return value.trim().toUpperCase();
}

/** Formats money for display. Never throws: unknown codes fall back to "<CODE> <number>". */
export function formatMoney(
  amount: number,
  currency: string,
  { cents = false, sign = false }: { cents?: boolean; sign?: boolean } = {},
): string {
  const digits = cents ? 2 : 0;
  const magnitude = Math.abs(amount);
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(magnitude);
  } catch {
    formatted = `${currency} ${magnitude.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })}`;
  }
  if (amount < 0) return `−${formatted}`;
  return sign ? `+${formatted}` : formatted;
}

export interface FormatMoneyOptions {
  cents?: boolean;
  sign?: boolean; // prefix "+" on positive values
}

/** The single place money is turned into display text. */
export function formatMoney(amount: number, currency: string, opts: FormatMoneyOptions = {}): string {
  const digits = opts.cents ? 2 : 0;
  const s = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(amount));
  if (amount < 0) return `−${s}`;
  return opts.sign ? `+${s}` : s;
}

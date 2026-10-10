const MONEY_PATTERN = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;

/**
 * Parses user-typed money text into a non-negative number.
 *
 * Trims whitespace, accepts plain digits or comma-grouped thousands with an
 * optional decimal part (e.g. "1,500.50"), and returns null for anything else
 * (empty, negative, malformed). Never returns NaN.
 */
export function parseMoneyInput(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!MONEY_PATTERN.test(trimmed)) return null;
  const value = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

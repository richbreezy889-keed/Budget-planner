import { describe, expect, it } from "vitest";

import { formatMoney, isValidCurrencyCode, normalizeCurrency } from "./format";

describe("formatMoney", () => {
  it("formats a known currency with and without cents", () => {
    expect(formatMoney(1234, "USD")).toBe("$1,234");
    expect(formatMoney(1234.5, "USD", { cents: true })).toBe("$1,234.50");
  });

  it("prefixes a minus and an optional plus", () => {
    expect(formatMoney(-20, "USD")).toBe("−$20");
    expect(formatMoney(20, "USD", { sign: true })).toBe("+$20");
  });

  it("never throws for currencies Intl rejects", () => {
    expect(() => formatMoney(1000, "Tsh.")).not.toThrow();
    expect(() => formatMoney(1000, "TZ")).not.toThrow();
    expect(() => formatMoney(1000, "Tanzanian shilling")).not.toThrow();
  });

  it('falls back to "<CODE> <number>" when Intl rejects the currency', () => {
    expect(formatMoney(1500.5, "Tsh.", { cents: true })).toBe("Tsh. 1,500.50");
    expect(formatMoney(1500, "TZ")).toBe("TZ 1,500");
    expect(formatMoney(-20, "TZ")).toBe("−TZ 20");
    expect(formatMoney(5, "TZ", { sign: true })).toBe("+TZ 5");
  });
});

describe("isValidCurrencyCode", () => {
  it("accepts three-letter codes", () => {
    expect(isValidCurrencyCode("USD")).toBe(true);
    expect(isValidCurrencyCode("TZS")).toBe(true);
    expect(isValidCurrencyCode("usd")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isValidCurrencyCode("TZ")).toBe(false);
    expect(isValidCurrencyCode("Tsh.")).toBe(false);
    expect(isValidCurrencyCode("Tanzanian shilling")).toBe(false);
    expect(isValidCurrencyCode("")).toBe(false);
    expect(isValidCurrencyCode("USDX")).toBe(false);
    expect(isValidCurrencyCode(123)).toBe(false);
    expect(isValidCurrencyCode(null)).toBe(false);
    expect(isValidCurrencyCode(undefined)).toBe(false);
  });
});

describe("normalizeCurrency", () => {
  it("trims and upper-cases", () => {
    expect(normalizeCurrency("  usd ")).toBe("USD");
    expect(normalizeCurrency("tzs")).toBe("TZS");
  });
});

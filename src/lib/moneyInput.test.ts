import { describe, expect, it } from "vitest";

import { parseMoneyInput } from "./moneyInput";

describe("parseMoneyInput", () => {
  it("parses plain digits", () => {
    expect(parseMoneyInput("0")).toBe(0);
    expect(parseMoneyInput("850")).toBe(850);
    expect(parseMoneyInput("1500")).toBe(1500);
  });

  it("parses an optional decimal part", () => {
    expect(parseMoneyInput("1500.5")).toBe(1500.5);
    expect(parseMoneyInput("0.99")).toBe(0.99);
    expect(parseMoneyInput("12.345")).toBe(12.345);
  });

  it("tolerates commas as thousand separators", () => {
    expect(parseMoneyInput("1,500.50")).toBe(1500.5);
    expect(parseMoneyInput("1,000")).toBe(1000);
    expect(parseMoneyInput("12,000,000.25")).toBe(12000000.25);
  });

  it("trims surrounding whitespace", () => {
    expect(parseMoneyInput("  42  ")).toBe(42);
    expect(parseMoneyInput("\t3.5\n")).toBe(3.5);
  });

  it("returns null for empty input", () => {
    expect(parseMoneyInput("")).toBeNull();
    expect(parseMoneyInput("   ")).toBeNull();
  });

  it("returns null for negative or signed input", () => {
    expect(parseMoneyInput("-5")).toBeNull();
    expect(parseMoneyInput("-0.5")).toBeNull();
    expect(parseMoneyInput("+5")).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(parseMoneyInput("abc")).toBeNull();
    expect(parseMoneyInput("$5")).toBeNull();
    expect(parseMoneyInput("5 USD")).toBeNull();
    expect(parseMoneyInput("1,5")).toBeNull();
    expect(parseMoneyInput("1,23,456")).toBeNull();
    expect(parseMoneyInput(".5")).toBeNull();
    expect(parseMoneyInput("5.")).toBeNull();
    expect(parseMoneyInput("1.2.3")).toBeNull();
    expect(parseMoneyInput("1e3")).toBeNull();
  });

  it("never returns NaN", () => {
    const inputs = [
      "",
      " ",
      "abc",
      "NaN",
      "Infinity",
      "-Infinity",
      "1,500.50",
      "0",
      ".",
      ",",
      "1,,000",
      "٥",
    ];
    for (const input of inputs) {
      const result = parseMoneyInput(input);
      expect(Number.isNaN(result as number)).toBe(false);
    }
  });
});

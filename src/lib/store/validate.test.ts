import { describe, expect, it } from "vitest";

import type { AppData } from "../types";
import { createSeedData } from "./seed";
import { exportData, importData, validateAppData } from "./validate";

const seed = (): AppData => createSeedData();

const errorsOf = (result: ReturnType<typeof validateAppData>): string[] => {
  if (result.ok) throw new Error("expected failure but validation passed");
  return result.errors;
};

describe("exportData / importData round trip", () => {
  it("round trips the demo seed", () => {
    const data = seed();
    const json = exportData(data);
    expect(typeof json).toBe("string");

    const result = importData(json);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual(data);
  });

  it("round trips a fresh empty dataset", () => {
    const data: AppData = {
      version: 1,
      isDemo: false,
      settings: {
        currency: "USD",
        weekStartDay: "Monday",
        baselineWeeklyIncome: 0,
        openingBufferBalance: 0,
      },
      incomeEntries: [],
      categories: [],
      transactions: [],
      bills: [],
      goals: [],
    };
    const result = importData(exportData(data));
    expect(result.ok).toBe(true);
  });
});

describe("validateAppData", () => {
  it("accepts the seed", () => {
    const result = validateAppData(seed());
    expect(result.ok).toBe(true);
  });

  it("rejects non-objects", () => {
    expect(errorsOf(validateAppData(null)).length).toBeGreaterThan(0);
    expect(errorsOf(validateAppData("nope")).length).toBeGreaterThan(0);
    expect(errorsOf(validateAppData([])).length).toBeGreaterThan(0);
  });

  it("rejects the wrong version", () => {
    const errors = errorsOf(validateAppData({ ...seed(), version: 2 }));
    expect(errors.some((message) => message.toLowerCase().includes("version"))).toBe(true);
  });

  it("rejects bad ISO date strings", () => {
    const data = seed();
    data.transactions[0] = { ...data.transactions[0]!, date: "2026/10/02" };
    const errors = errorsOf(validateAppData(data));
    expect(errors.some((message) => message.includes("date"))).toBe(true);
  });

  it("rejects impossible calendar dates", () => {
    const data = seed();
    data.incomeEntries[0] = { ...data.incomeEntries[0]!, date: "2026-02-30" };
    const errors = errorsOf(validateAppData(data));
    expect(errors.some((message) => message.includes("date"))).toBe(true);
  });

  it("rejects non-finite numbers", () => {
    const data = seed();
    data.incomeEntries[0] = { ...data.incomeEntries[0]!, amount: Number.NaN };
    expect(errorsOf(validateAppData(data)).length).toBeGreaterThan(0);

    const infinite = seed();
    infinite.settings = { ...infinite.settings, baselineWeeklyIncome: Number.POSITIVE_INFINITY };
    expect(errorsOf(validateAppData(infinite)).length).toBeGreaterThan(0);
  });

  it("rejects a dangling transaction categoryId", () => {
    const data = seed();
    data.transactions[0] = { ...data.transactions[0]!, categoryId: "does-not-exist" };
    const errors = errorsOf(validateAppData(data));
    expect(errors.some((message) => message.includes("does-not-exist"))).toBe(true);
  });

  it("rejects a dangling bill categoryId", () => {
    const data = seed();
    data.bills[0] = { ...data.bills[0]!, categoryId: "nope" };
    const errors = errorsOf(validateAppData(data));
    expect(errors.some((message) => message.includes("nope"))).toBe(true);
  });

  it("rejects duplicate ids", () => {
    const data = seed();
    const first = data.categories[0]!;
    data.categories = [...data.categories, { ...first }];
    const errors = errorsOf(validateAppData(data));
    expect(errors.some((message) => message.toLowerCase().includes("duplicate"))).toBe(true);
  });

  it("rejects non-array collections", () => {
    const errors = errorsOf(validateAppData({ ...seed(), categories: "nope" }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it("collects multiple errors", () => {
    const data = seed();
    data.transactions[0] = { ...data.transactions[0]!, date: "bad", categoryId: "nope" };
    data.incomeEntries[0] = { ...data.incomeEntries[0]!, amount: Number.NaN };
    const errors = errorsOf(validateAppData(data));
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe("importData", () => {
  it("reports malformed JSON without throwing", () => {
    const result = importData("{not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((message) => message.includes("JSON"))).toBe(true);
  });
});

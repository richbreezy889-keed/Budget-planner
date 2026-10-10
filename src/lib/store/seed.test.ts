import { describe, expect, it } from "vitest";

import { bills, categories, goals, incomeEntries, settings, transactions } from "../mockData";
import { weekStart } from "../calc";
import type { Settings } from "../types";
import { createSeedData, startFresh } from "./seed";
import { DEMO_ANCHOR_WEEK_START } from "./seed";

describe("createSeedData", () => {
  it("returns the mock data as demo version 1", () => {
    const seed = createSeedData();
    expect(seed.version).toBe(1);
    expect(seed.isDemo).toBe(true);
    expect(seed.settings).toEqual(settings);
    expect(seed.incomeEntries).toEqual(incomeEntries);
    expect(seed.categories).toEqual(categories);
    expect(seed.transactions).toEqual(transactions);
    expect(seed.bills).toEqual(bills);
    expect(seed.goals).toEqual(goals);
  });

  it("returns a fresh copy each call", () => {
    const first = createSeedData();
    first.incomeEntries.push({ id: "x", date: "2026-01-01", amount: 1, source: "x", note: "" });
    first.settings.baselineWeeklyIncome = 0;
    const second = createSeedData();
    expect(second.incomeEntries).toHaveLength(incomeEntries.length);
    expect(second.settings.baselineWeeklyIncome).toBe(settings.baselineWeeklyIncome);
  });

  it("anchors the demo shift to the Monday of the week with the latest mock activity", () => {
    const latest = [...incomeEntries, ...transactions]
      .map((entry) => entry.date)
      .sort()
      .at(-1)!;
    expect(weekStart(latest, "Monday")).toBe(DEMO_ANCHOR_WEEK_START);
    expect(new Date(`${DEMO_ANCHOR_WEEK_START}T00:00:00`).getDay()).toBe(1);
  });
});

describe("startFresh", () => {
  it("returns empty, non-demo data with the given settings", () => {
    const custom: Settings = {
      currency: "EUR",
      weekStartDay: "Sunday",
      baselineWeeklyIncome: 500,
      openingBufferBalance: 0,
    };
    const data = startFresh(custom);
    expect(data.version).toBe(1);
    expect(data.isDemo).toBe(false);
    expect(data.settings).toEqual(custom);
    expect(data.settings).not.toBe(custom);
    expect(data.incomeEntries).toEqual([]);
    expect(data.categories).toEqual([]);
    expect(data.transactions).toEqual([]);
    expect(data.bills).toEqual([]);
    expect(data.goals).toEqual([]);
  });
});

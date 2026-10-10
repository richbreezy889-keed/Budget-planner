import { describe, expect, it } from "vitest";

import { incomeInWeek } from "./calc";
import { demoView } from "./selectors";
import { createSeedData, startFresh } from "./store/seed";

const seed = (): ReturnType<typeof createSeedData> => createSeedData();

describe("demoView", () => {
  it("shifts demo income and transaction dates forward by whole weeks", () => {
    const shifted = demoView(seed(), "2026-10-19");

    expect(shifted.incomeEntries.map((entry) => entry.date)).toEqual(["2026-10-19", "2026-10-21"]);
    expect(shifted.transactions.map((transaction) => transaction.date)).toEqual([
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-22",
      "2026-10-23",
      "2026-10-23",
    ]);
    expect(shifted.goals.map((goal) => goal.targetDate)).toEqual([
      "2027-04-22",
      "2027-07-06",
      "2026-11-22",
    ]);
  });

  it("keeps income for the real current week equal to the demo's original current week", () => {
    const original = seed();
    const shifted = demoView(original, "2026-10-19");

    expect(incomeInWeek(shifted.incomeEntries, "2026-10-19")).toBe(
      incomeInWeek(original.incomeEntries, "2026-09-28"),
    );
    expect(incomeInWeek(shifted.incomeEntries, "2026-10-19")).toBeCloseTo(825, 6);
  });

  it("preserves the weekday of every income, transaction and goal date", () => {
    const original = seed();
    const shifted = demoView(original, "2026-10-19");

    const originalDates = [
      ...original.incomeEntries.map((entry) => entry.date),
      ...original.transactions.map((transaction) => transaction.date),
      ...original.goals.map((goal) => goal.targetDate ?? ""),
    ].filter(Boolean);
    const shiftedDates = [
      ...shifted.incomeEntries.map((entry) => entry.date),
      ...shifted.transactions.map((transaction) => transaction.date),
      ...shifted.goals.map((goal) => goal.targetDate ?? ""),
    ].filter(Boolean);

    expect(shiftedDates).toHaveLength(originalDates.length);
    originalDates.forEach((date, index) => {
      const weekdayOf = (iso: string) => new Date(`${iso}T00:00:00`).getDay();
      expect(weekdayOf(shiftedDates[index]!)).toBe(weekdayOf(date));
    });
  });

  it("leaves a day-of-month within the same week aligned for goal target dates", () => {
    const shifted = demoView(seed(), "2026-10-19");
    expect(shifted.goals[0]!.targetDate).toBe("2027-04-22");
  });

  it("returns non-demo data untouched", () => {
    const nonDemo = startFresh({
      currency: "USD",
      weekStartDay: "Monday",
      baselineWeeklyIncome: 850,
      openingBufferBalance: 2400,
    });
    expect(demoView(nonDemo, "2026-10-19")).toBe(nonDemo);
  });
});

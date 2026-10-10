import { describe, expect, it } from "vitest";

import { incomeInWeek } from "./calc";
import { bufferView, demoView, thisWeekView } from "./selectors";
import { createSeedData, startFresh } from "./store/seed";
import type { AppData } from "./types";

const seed = (): ReturnType<typeof createSeedData> => createSeedData();

const shift = (iso: string, days: number): string => {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year!, month! - 1, day! + days);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
};

const smallData = (): AppData => ({
  version: 1,
  isDemo: false,
  settings: {
    currency: "USD",
    weekStartDay: "Monday",
    baselineWeeklyIncome: 500,
    openingBufferBalance: 1000,
  },
  incomeEntries: [
    { id: "i1", date: "2026-03-02", amount: 300, source: "Payroll", note: "Salary" },
    { id: "i2", date: "2026-03-05", amount: 100, source: "Side gig", note: "Freelance" },
    { id: "i3", date: "2026-03-09", amount: 250, source: "Payroll", note: "Salary" },
  ],
  categories: [
    { id: "c1", name: "Rent", type: "essential", budgetAmount: 1300, budgetPeriod: "monthly" },
    { id: "c2", name: "Food", type: "essential", budgetAmount: 100, budgetPeriod: "weekly" },
    { id: "c3", name: "Fun", type: "flexible", budgetAmount: 60, budgetPeriod: "weekly" },
    { id: "c4", name: "Emergency", type: "savings", budgetAmount: 50, budgetPeriod: "weekly" },
  ],
  transactions: [
    { id: "t1", date: "2026-03-02", amount: 40, categoryId: "c2", note: "Groceries" },
    { id: "t2", date: "2026-03-03", amount: 1300, categoryId: "c1", note: "Rent" },
    { id: "t3", date: "2026-03-04", amount: 20, categoryId: "c3", note: "Movie" },
    { id: "t4", date: "2026-03-12", amount: 10, categoryId: "c2", note: "Milk" },
    { id: "t5", date: "2026-03-10", amount: 15, categoryId: "c3", note: "Ice cream" },
  ],
  bills: [
    { id: "b1", name: "Rent", amount: 1300, period: "monthly", categoryId: "c1", dueDay: "1st" },
    { id: "b2", name: "Netflix", amount: 14, period: "monthly", categoryId: "c2", dueDay: "15th" },
  ],
  goals: [
    { id: "g1", name: "Trip", targetAmount: 1000, savedAmount: 400, targetDate: "2026-03-30" },
  ],
});

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

describe("thisWeekView", () => {
  it("reports the current week's income, plan and waterfall", () => {
    const view = thisWeekView(smallData(), "2026-03-09");

    expect(view.weekStart).toBe("2026-03-09");
    expect(view.weekEnd).toBe("2026-03-15");
    expect(view.incomeLogged).toBe(250);
    expect(view.incomeEntryCount).toBe(1);
    expect(view.hasIncome).toBe(true);
    expect(view.plan).toEqual({ essentials: 400, savings: 50, goals: 200, flexible: 60 });
    expect(view.waterfall.allocated).toEqual({
      essentials: 250,
      savings: 0,
      goals: 0,
      flexible: 0,
    });
    expect(view.waterfall.shortfall).toEqual({
      essentials: 150,
      savings: 50,
      goals: 200,
      flexible: 60,
    });
    expect(view.waterfall.buffer).toBe(0);
    expect(view.flexibleBudget).toBe(60);
    expect(view.flexibleSpent).toBe(15);
    expect(view.safeToSpend).toBe(45);
    expect(view.status).toBe("safe");
    expect(view.flexibleShortfall).toBe(60);
  });

  it("lists week activity newest first with income and spending merged", () => {
    const view = thisWeekView(smallData(), "2026-03-09");

    expect(view.activity).toEqual([
      { kind: "spend", id: "t4", date: "2026-03-12", amount: 10, note: "Milk", categoryId: "c2" },
      {
        kind: "spend",
        id: "t5",
        date: "2026-03-10",
        amount: 15,
        note: "Ice cream",
        categoryId: "c3",
      },
      { kind: "income", id: "i3", date: "2026-03-09", amount: 250, note: "Salary" },
    ]);
  });

  it("reports an empty week for blank data", () => {
    const view = thisWeekView(
      startFresh({
        currency: "USD",
        weekStartDay: "Monday",
        baselineWeeklyIncome: 500,
        openingBufferBalance: 0,
      }),
      "2026-03-09",
    );

    expect(view.incomeLogged).toBe(0);
    expect(view.incomeEntryCount).toBe(0);
    expect(view.hasIncome).toBe(false);
    expect(view.activity).toEqual([]);
  });

  it("is unchanged by demoView's whole-week shift", () => {
    const original = seed();
    const shifted = demoView(original, "2026-10-19");
    const originalView = thisWeekView(original, "2026-09-28");
    const shiftedView = thisWeekView(shifted, "2026-10-19");

    expect(shiftedView.weekStart).toBe("2026-10-19");
    expect(shiftedView.incomeLogged).toBe(825);
    expect(shiftedView.incomeEntryCount).toBe(2);
    expect(shiftedView.hasIncome).toBe(true);
    expect(shiftedView.plan).toEqual(originalView.plan);
    expect(shiftedView.waterfall).toEqual(originalView.waterfall);
    expect(shiftedView.flexibleSpent).toBe(originalView.flexibleSpent);
    expect(shiftedView.status).toBe(originalView.status);
    expect(shiftedView.activity).toHaveLength(originalView.activity.length);
    originalView.activity.forEach((item, index) => {
      const shiftedItem = shiftedView.activity[index]!;
      expect(shiftedItem).toEqual({ ...item, date: shift(item.date, 21) });
    });
  });
});

describe("bufferView", () => {
  it("reports buffer, runway, averages and the weekly series", () => {
    const view = bufferView(smallData(), "2026-03-09");

    expect(view.bufferBalance).toBe(40);
    expect(view.changeThisWeek).toBe(225);
    expect(view.essentialsWeekly).toBe(400);
    expect(view.runwayWeeks).toBeCloseTo(0.1, 6);
    expect(view.avg4).toBe(400);
    expect(view.avg8).toBe(400);
    expect(view.baseline).toBe(500);
    expect(view.suggestedBaseline).toBeNull();
    expect(view.avg4VsBaseline).toBe("below");
    expect(view.series).toHaveLength(12);
    expect(view.series[11]).toEqual({ weekStart: "2026-03-09", income: 250, spending: 25 });
    expect(view.series[10]).toEqual({ weekStart: "2026-03-02", income: 400, spending: 1360 });
  });

  it("compares avg4 against the baseline", () => {
    const above = smallData();
    above.settings.baselineWeeklyIncome = 300;
    expect(bufferView(above, "2026-03-09").avg4VsBaseline).toBe("above");

    const equal = smallData();
    equal.settings.baselineWeeklyIncome = 400;
    expect(bufferView(equal, "2026-03-09").avg4VsBaseline).toBe("equal");
  });

  it("returns nulls when there is no history", () => {
    const view = bufferView(
      startFresh({
        currency: "USD",
        weekStartDay: "Monday",
        baselineWeeklyIncome: 500,
        openingBufferBalance: 0,
      }),
      "2026-03-09",
    );

    expect(view.bufferBalance).toBe(0);
    expect(view.changeThisWeek).toBe(0);
    expect(view.essentialsWeekly).toBe(0);
    expect(view.runwayWeeks).toBeNull();
    expect(view.avg4).toBeNull();
    expect(view.avg8).toBeNull();
    expect(view.suggestedBaseline).toBeNull();
    expect(view.avg4VsBaseline).toBeNull();
    expect(view.series).toHaveLength(12);
  });

  it("is unchanged by demoView's whole-week shift", () => {
    const original = seed();
    const shifted = demoView(original, "2026-10-19");
    const originalBuffer = bufferView(original, "2026-09-28");
    const shiftedBuffer = bufferView(shifted, "2026-10-19");

    expect(shiftedBuffer.bufferBalance).toBe(originalBuffer.bufferBalance);
    expect(shiftedBuffer.changeThisWeek).toBe(originalBuffer.changeThisWeek);
    expect(shiftedBuffer.essentialsWeekly).toBe(originalBuffer.essentialsWeekly);
    expect(shiftedBuffer.runwayWeeks).toBe(originalBuffer.runwayWeeks);
    expect(shiftedBuffer.avg4).toBe(originalBuffer.avg4);
    expect(shiftedBuffer.avg8).toBe(originalBuffer.avg8);
    expect(shiftedBuffer.baseline).toBe(originalBuffer.baseline);
    expect(shiftedBuffer.suggestedBaseline).toBe(originalBuffer.suggestedBaseline);
    expect(shiftedBuffer.avg4VsBaseline).toBe(originalBuffer.avg4VsBaseline);
    expect(shiftedBuffer.series.map((point) => [point.income, point.spending])).toEqual(
      originalBuffer.series.map((point) => [point.income, point.spending]),
    );
    expect(shiftedBuffer.series.map((point) => point.weekStart)).toEqual(
      originalBuffer.series.map((point) => shift(point.weekStart, 21)),
    );
  });
});

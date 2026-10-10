import { describe, expect, it } from "vitest";

import { incomeInWeek, spentInCategory } from "./calc";
import {
  billsGoalsView,
  budgetsView,
  bufferView,
  demoView,
  thisWeekView,
  trendsView,
} from "./selectors";
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

describe("budgetsView", () => {
  it("reports per-category budgets grouped by type with weekly totals", () => {
    const view = budgetsView(smallData(), "2026-03-09");

    expect(view.rows.map((row) => row.categoryId)).toEqual(["c1", "c2", "c4", "c3"]);

    expect(view.rows[0]).toEqual({
      categoryId: "c1",
      name: "Rent",
      type: "essential",
      plannedWeekly: 300,
      plannedInOwnPeriod: 1300,
      spentInOwnPeriod: 1300,
      progress: 1,
      overBy: 0,
      drivenByBills: false,
      billCount: 1,
      billsExceedBudget: 0,
    });
    expect(view.rows[1]).toEqual({
      categoryId: "c2",
      name: "Food",
      type: "essential",
      plannedWeekly: 100,
      plannedInOwnPeriod: 100,
      spentInOwnPeriod: 10,
      progress: 0.1,
      overBy: 0,
      drivenByBills: false,
      billCount: 1,
      billsExceedBudget: 0,
    });
    expect(view.rows[2]).toEqual({
      categoryId: "c4",
      name: "Emergency",
      type: "savings",
      plannedWeekly: 50,
      plannedInOwnPeriod: 50,
      spentInOwnPeriod: 0,
      progress: 0,
      overBy: 0,
      drivenByBills: false,
      billCount: 0,
      billsExceedBudget: 0,
    });
    expect(view.rows[3]).toEqual({
      categoryId: "c3",
      name: "Fun",
      type: "flexible",
      plannedWeekly: 60,
      plannedInOwnPeriod: 60,
      spentInOwnPeriod: 15,
      progress: 0.25,
      overBy: 0,
      drivenByBills: false,
      billCount: 0,
      billsExceedBudget: 0,
    });

    expect(view.totals).toEqual({ essential: 400, savings: 50, flexible: 60 });
    const sumFor = (type: "essential" | "savings" | "flexible") =>
      view.rows.filter((row) => row.type === type).reduce((sum, row) => sum + row.plannedWeekly, 0);
    expect(view.totals.essential).toBeCloseTo(sumFor("essential"), 6);
    expect(view.totals.savings).toBeCloseTo(sumFor("savings"), 6);
    expect(view.totals.flexible).toBeCloseTo(sumFor("flexible"), 6);
  });

  it("reports overBy and bill pressure for a bill-driven category", () => {
    const data = smallData();
    data.categories.push({
      id: "c5",
      name: "Utilities",
      type: "essential",
      budgetAmount: 20,
      budgetPeriod: "weekly",
    });
    data.bills.push({
      id: "b3",
      name: "Power",
      amount: 30,
      period: "weekly",
      categoryId: "c5",
      dueDay: "Thursday",
    });
    data.transactions.push({
      id: "t6",
      date: "2026-03-11",
      amount: 45,
      categoryId: "c5",
      note: "Power bill",
    });

    const view = budgetsView(data, "2026-03-09");
    const row = view.rows.find((entry) => entry.categoryId === "c5")!;

    expect(row.plannedWeekly).toBe(30);
    expect(row.drivenByBills).toBe(true);
    expect(row.billCount).toBe(1);
    expect(row.billsExceedBudget).toBeCloseTo(10, 6);
    expect(row.spentInOwnPeriod).toBe(45);
    expect(row.progress).toBeCloseTo(1.5, 6);
    expect(row.overBy).toBe(15);
    expect(view.totals.essential).toBeCloseTo(430, 6);
  });

  it("returns empty rows and zero totals for blank data", () => {
    const view = budgetsView(
      startFresh({
        currency: "USD",
        weekStartDay: "Monday",
        baselineWeeklyIncome: 500,
        openingBufferBalance: 0,
      }),
      "2026-03-09",
    );

    expect(view.rows).toEqual([]);
    expect(view.totals).toEqual({ essential: 0, savings: 0, flexible: 0 });
  });

  it("derives spentInOwnPeriod from calc's spentInCategory", () => {
    const data = smallData();
    const view = budgetsView(data, "2026-03-09");

    for (const row of view.rows) {
      const category = data.categories.find((entry) => entry.id === row.categoryId)!;
      expect(row.spentInOwnPeriod).toBe(
        spentInCategory(
          category.id,
          data.transactions,
          category.budgetPeriod,
          "2026-03-09",
          data.settings.weekStartDay,
        ),
      );
    }
  });

  it("keeps planned and bill fields unchanged by demoView's whole-week shift", () => {
    const original = seed();
    const shifted = demoView(original, "2026-10-19");
    const originalView = budgetsView(original, "2026-09-28");
    const shiftedView = budgetsView(shifted, "2026-10-19");

    expect(shiftedView.totals).toEqual(originalView.totals);
    expect(shiftedView.rows.map((row) => [row.categoryId, row.plannedWeekly])).toEqual(
      originalView.rows.map((row) => [row.categoryId, row.plannedWeekly]),
    );
    expect(
      shiftedView.rows.map((row) => [
        row.drivenByBills,
        row.billCount,
        row.billsExceedBudget,
        row.plannedInOwnPeriod,
      ]),
    ).toEqual(
      originalView.rows.map((row) => [
        row.drivenByBills,
        row.billCount,
        row.billsExceedBudget,
        row.plannedInOwnPeriod,
      ]),
    );

    const weeklyCategoryIds = shiftedView.rows
      .filter((row) => row.plannedInOwnPeriod === row.plannedWeekly)
      .map((row) => row.categoryId);
    for (const categoryId of weeklyCategoryIds) {
      expect(shiftedView.rows.find((row) => row.categoryId === categoryId)!.spentInOwnPeriod).toBe(
        originalView.rows.find((row) => row.categoryId === categoryId)!.spentInOwnPeriod,
      );
    }
  });
});

describe("billsGoalsView", () => {
  it("reports bills with weekly equivalents and a weekly total", () => {
    const view = billsGoalsView(smallData(), "2026-03-09");

    expect(view.bills.map((bill) => [bill.id, bill.name, bill.categoryId])).toEqual([
      ["b1", "Rent", "c1"],
      ["b2", "Netflix", "c2"],
    ]);
    expect(view.bills[0]!.weekly).toBe(300);
    expect(view.bills[1]!.weekly).toBeCloseTo((14 * 12) / 52, 6);
    expect(view.weeklyTotal).toBeCloseTo(303.230769, 6);
  });

  it("reports goal progress, remaining, contribution and weeks left", () => {
    const view = billsGoalsView(smallData(), "2026-03-09");

    expect(view.goals).toEqual([
      {
        id: "g1",
        name: "Trip",
        targetAmount: 1000,
        savedAmount: 400,
        progress: 0.4,
        remaining: 600,
        weeklyContribution: 200,
        weeksLeft: 3,
      },
    ]);
  });

  it("keeps weeksLeft null and contribution zero for goals without a target date", () => {
    const data = smallData();
    data.goals = [
      { id: "g2", name: "No date", targetAmount: 0, savedAmount: 0 },
      { id: "g3", name: "Over-saved", targetAmount: 500, savedAmount: 1000 },
    ];

    const [noDate, overSaved] = billsGoalsView(data, "2026-03-09").goals;

    expect(noDate).toMatchObject({
      progress: 0,
      remaining: 0,
      weeklyContribution: 0,
      weeksLeft: null,
    });
    expect(overSaved).toMatchObject({
      progress: 1,
      remaining: 0,
      weeklyContribution: 0,
      weeksLeft: null,
    });
  });

  it("is unchanged by demoView's whole-week shift", () => {
    const original = seed();
    const shifted = demoView(original, "2026-10-19");

    expect(billsGoalsView(shifted, "2026-10-19")).toEqual(billsGoalsView(original, "2026-09-28"));
  });
});

describe("trendsView", () => {
  it("reports a 12-week series and a 4-month rollup", () => {
    const view = trendsView(smallData(), "2026-03-09");

    expect(view.series).toHaveLength(12);
    expect(view.series[11]).toEqual({ weekStart: "2026-03-09", income: 250, spending: 25 });
    expect(view.series[10]).toEqual({ weekStart: "2026-03-02", income: 400, spending: 1360 });

    expect(view.rollup).toHaveLength(4);
    expect(view.rollup[3]).toEqual({
      month: "2026-03",
      income: 650,
      spending: 1385,
      net: -735,
    });
  });

  it("returns empty series and rollup for blank data", () => {
    const view = trendsView(
      startFresh({
        currency: "USD",
        weekStartDay: "Monday",
        baselineWeeklyIncome: 500,
        openingBufferBalance: 0,
      }),
      "2026-03-09",
    );

    expect(view.series).toHaveLength(12);
    expect(view.series.every((point) => point.income === 0 && point.spending === 0)).toBe(true);
    expect(view.rollup).toHaveLength(4);
    expect(view.rollup.every((point) => point.income === 0 && point.spending === 0)).toBe(true);
  });

  it("shifts the weekly series values unchanged by demoView's whole-week shift", () => {
    const original = seed();
    const shifted = demoView(original, "2026-10-19");
    const originalView = trendsView(original, "2026-09-28");
    const shiftedView = trendsView(shifted, "2026-10-19");

    expect(shiftedView.series.map((point) => [point.income, point.spending])).toEqual(
      originalView.series.map((point) => [point.income, point.spending]),
    );
    expect(shiftedView.series.map((point) => point.weekStart)).toEqual(
      originalView.series.map((point) => shift(point.weekStart, 21)),
    );
    expect(shiftedView.rollup).toHaveLength(originalView.rollup.length);
    expect(shiftedView.rollup[3]!.month).toBe("2026-10");
  });
});

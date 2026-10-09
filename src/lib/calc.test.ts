import { describe, expect, it } from "vitest";
import { bills, categories, goals, incomeEntries, transactions } from "./mockData";
import type { Category, Goal, IncomeEntry, RecurringBill, Transaction } from "./types";
import {
  allocateWaterfall,
  bufferBalanceAsOf,
  bufferChangeInWeek,
  categoryWeeklyPlanned,
  goalWeeklyContributionAsOf,
  incomeInWeek,
  spentInWeek,
  weekEnd,
  weekStart,
  weeklyEssentials,
  weeklyEquivalent,
  weeklyPlannedByType,
} from "./calc";

const cat = (id: string): Category => {
  const found = categories.find((c) => c.id === id);
  if (!found) throw new Error(`missing category ${id}`);
  return found;
};

describe("weeklyEquivalent", () => {
  it("returns weekly amounts unchanged", () => {
    expect(weeklyEquivalent(120, "weekly")).toBe(120);
  });

  it("converts monthly amounts with amount * 12 / 52", () => {
    expect(weeklyEquivalent(1450, "monthly")).toBeCloseTo(334.6154, 4);
    expect(weeklyEquivalent(85, "monthly")).toBeCloseTo(19.6154, 4);
  });

  it("converts yearly amounts with amount / 52", () => {
    expect(weeklyEquivalent(180, "yearly")).toBeCloseTo(3.4615, 4);
  });
});

describe("weekStart / weekEnd", () => {
  it("finds the Monday week containing a mid-week date", () => {
    expect(weekStart("2026-09-30", "Monday")).toBe("2026-09-28");
    expect(weekEnd("2026-09-30", "Monday")).toBe("2026-10-04");
  });

  it("finds the Sunday week containing a mid-week date", () => {
    expect(weekStart("2026-09-30", "Sunday")).toBe("2026-09-27");
    expect(weekEnd("2026-09-30", "Sunday")).toBe("2026-10-03");
  });

  it("finds the Saturday week containing a mid-week date", () => {
    expect(weekStart("2026-09-30", "Saturday")).toBe("2026-09-26");
    expect(weekEnd("2026-09-30", "Saturday")).toBe("2026-10-02");
  });

  it("treats the first and last day of a week as inside it", () => {
    expect(weekStart("2026-09-28", "Monday")).toBe("2026-09-28");
    expect(weekStart("2026-10-04", "Monday")).toBe("2026-09-28");
    expect(weekEnd("2026-10-04", "Monday")).toBe("2026-10-04");
    expect(weekStart("2026-10-04", "Sunday")).toBe("2026-10-04");
  });

  it("handles month boundaries", () => {
    expect(weekStart("2026-10-01", "Monday")).toBe("2026-09-28");
    expect(weekEnd("2026-09-28", "Monday")).toBe("2026-10-04");
  });

  it("handles year boundaries", () => {
    expect(weekStart("2026-01-01", "Monday")).toBe("2025-12-29");
    expect(weekEnd("2026-01-01", "Monday")).toBe("2026-01-04");
    expect(weekStart("2026-01-01", "Sunday")).toBe("2025-12-28");
    expect(weekEnd("2026-01-01", "Sunday")).toBe("2026-01-03");
  });

  it("does not shift a date through UTC", () => {
    // A Monday stays the start of its own week regardless of local offset.
    expect(weekStart("2026-09-28", "Monday")).toBe("2026-09-28");
    expect(weekEnd("2026-09-28", "Monday")).toBe("2026-10-04");
  });
});

describe("categoryWeeklyPlanned", () => {
  it("uses the category budget when no bill links to it", () => {
    expect(categoryWeeklyPlanned(cat("groceries"), bills)).toBeCloseTo(110, 4);
    expect(categoryWeeklyPlanned(cat("transport"), bills)).toBeCloseTo(45, 4);
    expect(categoryWeeklyPlanned(cat("dining"), bills)).toBeCloseTo(60, 4);
    expect(categoryWeeklyPlanned(cat("emergency"), bills)).toBeCloseTo(60, 4);
    expect(categoryWeeklyPlanned(cat("retirement"), bills)).toBeCloseTo(69.2308, 4);
  });

  it("sums linked bills' weekly equivalents and ignores the category budget", () => {
    expect(categoryWeeklyPlanned(cat("utilities"), bills)).toBeCloseTo(42.6923, 4);
    expect(categoryWeeklyPlanned(cat("fun"), bills)).toBeCloseTo(12, 4);
    expect(categoryWeeklyPlanned(cat("rent"), bills)).toBeCloseTo(334.6154, 4);
  });

  it("counts each linked bill exactly once", () => {
    const custom: Category = {
      id: "test",
      name: "Test",
      type: "flexible",
      budgetAmount: 999,
      budgetPeriod: "weekly",
    };
    const linked: RecurringBill[] = [
      { id: "x1", name: "X1", amount: 10, period: "weekly", categoryId: "test", dueDay: "Monday" },
      { id: "x2", name: "X2", amount: 20, period: "weekly", categoryId: "test", dueDay: "Monday" },
    ];
    expect(categoryWeeklyPlanned(custom, linked)).toBeCloseTo(30, 6);
  });
});

describe("weeklyPlannedByType / weeklyEssentials", () => {
  it("sums planned amounts per category type", () => {
    const planned = weeklyPlannedByType(categories, bills);
    expect(planned.essential).toBeCloseTo(532.3077, 4);
    expect(planned.savings).toBeCloseTo(129.2308, 4);
    expect(planned.flexible).toBeCloseTo(92, 4);
    expect(planned.weeklyEssentials).toBeCloseTo(532.3077, 4);
  });

  it("reports weeklyEssentials as exactly the essential total", () => {
    const planned = weeklyPlannedByType(categories, bills);
    expect(weeklyEssentials(categories, bills)).toBeCloseTo(planned.essential, 10);
  });

  it("returns zeroes when there are no categories", () => {
    expect(weeklyPlannedByType([], [])).toEqual({
      essential: 0,
      savings: 0,
      flexible: 0,
      weeklyEssentials: 0,
    });
  });
});

describe("incomeInWeek / spentInWeek", () => {
  it("sums income inside the week", () => {
    expect(incomeInWeek(incomeEntries, "2026-09-28")).toBeCloseTo(825, 6);
  });

  it("ignores income outside the week", () => {
    expect(incomeInWeek(incomeEntries, "2026-09-21")).toBeCloseTo(0, 6);
    expect(incomeInWeek(incomeEntries, "2026-10-05")).toBeCloseTo(0, 6);
  });

  it("includes both week boundaries", () => {
    const edges = [
      { id: "a", date: "2026-09-28", amount: 10, source: "s", note: "" },
      { id: "b", date: "2026-10-04", amount: 5, source: "s", note: "" },
      { id: "c", date: "2026-10-05", amount: 100, source: "s", note: "" },
    ];
    expect(incomeInWeek(edges, "2026-09-28")).toBeCloseTo(15, 6);
  });

  it("sums all spending when no category filter is given", () => {
    expect(spentInWeek(transactions, null, "2026-09-28")).toBeCloseTo(237.9, 6);
  });

  it("filters spending by category", () => {
    expect(spentInWeek(transactions, ["groceries"], "2026-09-28")).toBeCloseTo(74.9, 6);
    expect(spentInWeek(transactions, ["groceries", "coffee"], "2026-09-28")).toBeCloseTo(92.4, 6);
    expect(spentInWeek(transactions, [], "2026-09-28")).toBeCloseTo(0, 6);
  });
});

describe("goalWeeklyContributionAsOf", () => {
  it("returns 0 when the goal has no target date", () => {
    const goal: Goal = { id: "x", name: "X", targetAmount: 100, savedAmount: 0 };
    expect(goalWeeklyContributionAsOf(goal, "2026-09-28")).toBe(0);
  });

  it("returns 0 when the goal is already fully funded", () => {
    const goal: Goal = {
      id: "x",
      name: "X",
      targetAmount: 100,
      savedAmount: 120,
      targetDate: "2027-01-01",
    };
    expect(goalWeeklyContributionAsOf(goal, "2026-09-28")).toBe(0);
  });

  it("spreads the remaining amount over the whole weeks left", () => {
    const oneWeek: Goal = {
      id: "x",
      name: "X",
      targetAmount: 700,
      savedAmount: 0,
      targetDate: "2026-10-05",
    };
    const twoWeeks: Goal = {
      id: "x",
      name: "X",
      targetAmount: 700,
      savedAmount: 0,
      targetDate: "2026-10-12",
    };
    expect(goalWeeklyContributionAsOf(oneWeek, "2026-09-28")).toBeCloseTo(700, 6);
    expect(goalWeeklyContributionAsOf(twoWeeks, "2026-09-28")).toBeCloseTo(350, 6);
  });

  it("rounds partial weeks up and never uses fewer than one week", () => {
    const partial: Goal = {
      id: "x",
      name: "X",
      targetAmount: 700,
      savedAmount: 0,
      targetDate: "2026-10-06",
    };
    const past: Goal = {
      id: "x",
      name: "X",
      targetAmount: 700,
      savedAmount: 0,
      targetDate: "2026-09-01",
    };
    expect(goalWeeklyContributionAsOf(partial, "2026-09-28")).toBeCloseTo(350, 6);
    expect(goalWeeklyContributionAsOf(past, "2026-09-28")).toBeCloseTo(700, 6);
  });

  it("matches the mock Lisbon goal", () => {
    const lisbon = goals.find((g) => g.id === "g1");
    if (!lisbon) throw new Error("missing goal");
    expect(goalWeeklyContributionAsOf(lisbon, "2026-09-28")).toBeCloseTo(680 / 27, 6);
  });
});

describe("allocateWaterfall", () => {
  const plan = { essentials: 500, savings: 100, goals: 80, flexible: 60 };

  it("allocates nothing and reports a full shortfall at zero income", () => {
    const result = allocateWaterfall(0, plan);
    expect(result.allocated).toEqual({ essentials: 0, savings: 0, goals: 0, flexible: 0 });
    expect(result.buffer).toBeCloseTo(0, 6);
    expect(result.shortfall).toEqual({ essentials: 500, savings: 100, goals: 80, flexible: 60 });
  });

  it("fills essentials first when income is below essentials", () => {
    const result = allocateWaterfall(300, plan);
    expect(result.allocated).toEqual({ essentials: 300, savings: 0, goals: 0, flexible: 0 });
    expect(result.buffer).toBeCloseTo(0, 6);
    expect(result.shortfall).toEqual({ essentials: 200, savings: 100, goals: 80, flexible: 60 });
  });

  it("flows into the next bucket in order", () => {
    const result = allocateWaterfall(550, plan);
    expect(result.allocated).toEqual({ essentials: 500, savings: 50, goals: 0, flexible: 0 });
    expect(result.shortfall).toEqual({ essentials: 0, savings: 50, goals: 80, flexible: 60 });
  });

  it("meets the plan exactly with nothing left over", () => {
    const result = allocateWaterfall(740, plan);
    expect(result.allocated).toEqual(plan);
    expect(result.buffer).toBeCloseTo(0, 6);
    expect(result.shortfall).toEqual({ essentials: 0, savings: 0, goals: 0, flexible: 0 });
  });

  it("sends income above the plan to the buffer", () => {
    const result = allocateWaterfall(900, plan);
    expect(result.allocated).toEqual(plan);
    expect(result.buffer).toBeCloseTo(160, 6);
    expect(result.shortfall).toEqual({ essentials: 0, savings: 0, goals: 0, flexible: 0 });
  });
});

describe("bufferBalanceAsOf", () => {
  it("returns the opening balance before any completed week", () => {
    expect(bufferBalanceAsOf(2400, incomeEntries, transactions, "2026-09-28")).toBeCloseTo(2400, 6);
  });

  it("adds income and removes spending from completed weeks only", () => {
    expect(bufferBalanceAsOf(2400, incomeEntries, transactions, "2026-10-05")).toBeCloseTo(
      2987.1,
      6,
    );
  });

  it("excludes entries dated on the as-of week itself", () => {
    const income: IncomeEntry[] = [
      { id: "a", date: "2026-09-01", amount: 50, source: "s", note: "" },
      { id: "b", date: "2026-10-05", amount: 200, source: "s", note: "" },
    ];
    const txs: Transaction[] = [
      { id: "a", date: "2026-09-02", amount: 30, categoryId: "groceries", note: "" },
      { id: "b", date: "2026-10-06", amount: 40, categoryId: "fun", note: "" },
    ];
    expect(bufferBalanceAsOf(100, income, txs, "2026-10-05")).toBeCloseTo(120, 6);
  });
});

describe("bufferChangeInWeek", () => {
  it("reports income minus spending for the current week", () => {
    expect(bufferChangeInWeek(incomeEntries, transactions, "2026-09-28")).toBeCloseTo(587.1, 6);
  });

  it("reports zero for a week with no activity", () => {
    expect(bufferChangeInWeek(incomeEntries, transactions, "2026-09-21")).toBeCloseTo(0, 6);
  });
});

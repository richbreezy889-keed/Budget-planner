import { describe, expect, it } from "vitest";
import {
  bills,
  categories,
  currentWeek,
  goals,
  incomeEntries,
  settings,
  transactions,
} from "./mockData";
import type { Category, Goal, IncomeEntry, RecurringBill, Transaction } from "./types";
import {
  allocateWaterfall,
  bufferBalanceAsOf,
  bufferChangeInWeek,
  categoryProgress,
  categoryWeeklyPlanned,
  goalWeeklyContributionAsOf,
  incomeInWeek,
  rollingAverageIncomeAsOf,
  runwayWeeksFromEssentials,
  safeToSpendAmount,
  safeToSpendStatus,
  spentInCategory,
  spentInWeek,
  suggestedBaseline,
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

  it("uses the bills total when linked bills exceed the budget", () => {
    // utilities bills = 85+55+30 monthly + 180 yearly = 42.6923 > budget 160/month = 36.9231
    expect(categoryWeeklyPlanned(cat("utilities"), bills)).toBeCloseTo(42.6923, 4);
  });

  it("keeps the budget when the budget exceeds the linked bills", () => {
    // fun budget = 50/week > gym bill 12/week
    expect(categoryWeeklyPlanned(cat("fun"), bills)).toBeCloseTo(50, 4);
    // rent budget and bill are both 1450/month
    expect(categoryWeeklyPlanned(cat("rent"), bills)).toBeCloseTo(334.6154, 4);
  });

  it("never adds budget and bills together", () => {
    const custom: Category = {
      id: "test",
      name: "Test",
      type: "flexible",
      budgetAmount: 100,
      budgetPeriod: "weekly",
    };
    const linked: RecurringBill[] = [
      { id: "x1", name: "X1", amount: 20, period: "weekly", categoryId: "test", dueDay: "Monday" },
      { id: "x2", name: "X2", amount: 10, period: "weekly", categoryId: "test", dueDay: "Monday" },
    ];
    expect(categoryWeeklyPlanned(custom, linked)).toBeCloseTo(100, 6);
    expect(categoryWeeklyPlanned(custom, linked)).not.toBeCloseTo(130, 6);
  });

  it("sums two bills when they exceed the budget", () => {
    const custom: Category = {
      id: "test",
      name: "Test",
      type: "flexible",
      budgetAmount: 25,
      budgetPeriod: "weekly",
    };
    const linked: RecurringBill[] = [
      { id: "x1", name: "X1", amount: 20, period: "weekly", categoryId: "test", dueDay: "Monday" },
      { id: "x2", name: "X2", amount: 10, period: "weekly", categoryId: "test", dueDay: "Monday" },
    ];
    expect(categoryWeeklyPlanned(custom, linked)).toBeCloseTo(30, 6);
  });
});

describe("weeklyPlannedByType / weeklyEssentials", () => {
  it("sums planned amounts per category type", () => {
    const planned = weeklyPlannedByType(categories, bills);
    expect(planned.essential).toBeCloseTo(532.3077, 4);
    expect(planned.savings).toBeCloseTo(129.2308, 4);
    expect(planned.flexible).toBeCloseTo(130, 4);
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

describe("spentInCategory", () => {
  it("sums a category's spend within the week containing asOfDate", () => {
    expect(spentInCategory("groceries", transactions, "weekly", "2026-09-30")).toBeCloseTo(74.9, 6);
    expect(spentInCategory("transport", transactions, "weekly", "2026-09-30")).toBeCloseTo(32, 6);
    expect(spentInCategory("coffee", transactions, "weekly", "2026-10-01")).toBeCloseTo(17.5, 6);
  });

  it("sums a category's spend within the calendar month containing asOfDate", () => {
    expect(spentInCategory("groceries", transactions, "monthly", "2026-09-15")).toBeCloseTo(
      52.4,
      6,
    );
    expect(spentInCategory("groceries", transactions, "monthly", "2026-10-15")).toBeCloseTo(
      22.5,
      6,
    );
  });

  it("respects the configured week start day", () => {
    const txns: Transaction[] = [
      { id: "a", date: "2026-09-27", amount: 10, categoryId: "g", note: "" },
      { id: "b", date: "2026-09-28", amount: 20, categoryId: "g", note: "" },
    ];
    expect(spentInCategory("g", txns, "weekly", "2026-09-28", "Monday")).toBeCloseTo(20, 6);
    expect(spentInCategory("g", txns, "weekly", "2026-09-28", "Sunday")).toBeCloseTo(30, 6);
  });

  it("uses the latest transaction date when asOfDate is omitted", () => {
    expect(spentInCategory("groceries", transactions, "weekly")).toBeCloseTo(74.9, 6);
    expect(spentInCategory("groceries", transactions, "monthly")).toBeCloseTo(22.5, 6);
  });

  it("returns zero for empty or unmatched input", () => {
    expect(spentInCategory("groceries", [], "weekly", "2026-09-30")).toBe(0);
    expect(spentInCategory("rent", transactions, "weekly", "2026-09-30")).toBe(0);
  });
});

describe("categoryProgress", () => {
  it("returns the spent-over-budget ratio clamped to one", () => {
    expect(categoryProgress(50, 100)).toBeCloseTo(0.5, 6);
    expect(categoryProgress(100, 100)).toBeCloseTo(1, 6);
    expect(categoryProgress(150, 100)).toBeCloseTo(1, 6);
    expect(categoryProgress(0, 100)).toBeCloseTo(0, 6);
  });

  it("returns one when there is spend but no usable budget", () => {
    expect(categoryProgress(5, 0)).toBe(1);
    expect(categoryProgress(5, -10)).toBe(1);
    expect(categoryProgress(0, 0)).toBe(0);
    expect(categoryProgress(0, -10)).toBe(0);
  });

  it("never returns NaN or Infinity", () => {
    expect(categoryProgress(50, Number.NaN)).toBe(1);
    expect(categoryProgress(0, Number.NaN)).toBe(0);
    expect(categoryProgress(Number.NaN, 100)).toBe(0);
    expect(Number.isFinite(categoryProgress(50, Number.POSITIVE_INFINITY))).toBe(true);
    expect(categoryProgress(50, Number.POSITIVE_INFINITY)).toBe(0);
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

describe("runwayWeeksFromEssentials", () => {
  it("returns null when essentials are zero or negative", () => {
    expect(runwayWeeksFromEssentials(1000, 0)).toBeNull();
    expect(runwayWeeksFromEssentials(1000, -5)).toBeNull();
  });

  it("returns zero when the buffer is empty or negative", () => {
    expect(runwayWeeksFromEssentials(0, 100)).toBe(0);
    expect(runwayWeeksFromEssentials(-50, 100)).toBe(0);
  });

  it("divides the buffer by weekly essentials", () => {
    expect(runwayWeeksFromEssentials(300, 100)).toBeCloseTo(3, 6);
    expect(runwayWeeksFromEssentials(650, 200)).toBeCloseTo(3.25, 6);
  });

  it("matches the mock buffer and essentials", () => {
    const buffer = bufferBalanceAsOf(2400, incomeEntries, transactions, "2026-10-05");
    const essentials = weeklyEssentials(categories, bills);
    expect(runwayWeeksFromEssentials(buffer, essentials)).toBeCloseTo(2987.1 / 532.3077, 4);
  });
});

describe("rollingAverageIncomeAsOf", () => {
  const entries: IncomeEntry[] = [
    { id: "e1", date: "2026-09-09", amount: 100, source: "s", note: "" },
    { id: "e2", date: "2026-09-23", amount: 250, source: "s", note: "" },
    { id: "e3", date: "2026-09-30", amount: 75, source: "s", note: "" },
  ];

  it("averages only completed weeks", () => {
    expect(rollingAverageIncomeAsOf(entries, 2, "2026-10-05")).toBeCloseTo(162.5, 6);
    expect(rollingAverageIncomeAsOf(entries, 1, "2026-10-05")).toBeCloseTo(75, 6);
  });

  it("counts completed weeks with no income as zero", () => {
    expect(rollingAverageIncomeAsOf(entries, 4, "2026-10-05")).toBeCloseTo(106.25, 6);
  });

  it("ignores weeks before the first income entry", () => {
    expect(rollingAverageIncomeAsOf(entries, 6, "2026-10-05")).toBeCloseTo(106.25, 6);
    expect(rollingAverageIncomeAsOf(entries, 4, "2026-09-28")).toBeCloseTo(350 / 3, 6);
  });

  it("returns null when no completed week has an entry or history", () => {
    expect(rollingAverageIncomeAsOf([], 4, "2026-10-05")).toBeNull();
    expect(rollingAverageIncomeAsOf(entries, 4, "2026-09-07")).toBeNull();
  });
});

describe("suggestedBaseline", () => {
  const weekly: IncomeEntry[] = [
    { id: "w1", date: "2026-08-03", amount: 900, source: "s", note: "" },
    { id: "w2", date: "2026-08-10", amount: 300, source: "s", note: "" },
    { id: "w3", date: "2026-08-17", amount: 700, source: "s", note: "" },
    { id: "w4", date: "2026-08-24", amount: 200, source: "s", note: "" },
    { id: "w5", date: "2026-08-31", amount: 800, source: "s", note: "" },
    { id: "w6", date: "2026-09-07", amount: 400, source: "s", note: "" },
    { id: "w7", date: "2026-09-14", amount: 600, source: "s", note: "" },
    { id: "w8", date: "2026-09-21", amount: 500, source: "s", note: "" },
  ];

  it("averages the lowest four of the last eight completed weeks", () => {
    expect(suggestedBaseline(weekly, "2026-09-28")).toBeCloseTo(350, 6);
  });

  it("ignores weeks older than eight completed weeks", () => {
    const older: IncomeEntry[] = [
      ...weekly,
      { id: "w0", date: "2026-07-27", amount: 50, source: "s", note: "" },
    ];
    expect(suggestedBaseline(older, "2026-09-28")).toBeCloseTo(350, 6);
  });

  it("returns null with fewer than four weeks of history", () => {
    expect(suggestedBaseline([], "2026-09-28")).toBeNull();
    const recent: IncomeEntry[] = [
      { id: "r1", date: "2026-09-14", amount: 500, source: "s", note: "" },
      { id: "r2", date: "2026-09-21", amount: 600, source: "s", note: "" },
    ];
    expect(suggestedBaseline(recent, "2026-09-28")).toBeNull();
  });
});

describe("safeToSpendAmount / safeToSpendStatus", () => {
  it("subtracts spending from the flexible budget", () => {
    expect(safeToSpendAmount(260, 74.9)).toBeCloseTo(185.1, 6);
    expect(safeToSpendAmount(260, 300)).toBeCloseTo(-40, 6);
  });

  it("is safe above 20% of the budget", () => {
    expect(safeToSpendStatus(186, 260)).toBe("safe");
    expect(safeToSpendStatus(53, 260)).toBe("safe");
  });

  it("is caution from zero up to 20% inclusive", () => {
    expect(safeToSpendStatus(52, 260)).toBe("caution");
    expect(safeToSpendStatus(51.99, 260)).toBe("caution");
    expect(safeToSpendStatus(0, 260)).toBe("caution");
  });

  it("is danger below zero", () => {
    expect(safeToSpendStatus(-0.01, 260)).toBe("danger");
    expect(safeToSpendStatus(-40, 260)).toBe("danger");
  });

  it("handles a zero budget without dividing by zero", () => {
    expect(safeToSpendStatus(0, 0)).toBe("caution");
    expect(safeToSpendStatus(-1, 0)).toBe("danger");
  });
});

describe("DST timezone stability", () => {
  it("keeps weeks stable across New York DST transitions", () => {
    // Spring forward 2026-03-08 and fall back 2026-11-01.
    expect(weekStart("2026-03-08", "Sunday")).toBe("2026-03-08");
    expect(weekEnd("2026-03-08", "Sunday")).toBe("2026-03-14");
    expect(weekStart("2026-03-10", "Monday")).toBe("2026-03-09");
    expect(weekEnd("2026-03-10", "Monday")).toBe("2026-03-15");
    expect(weekStart("2026-11-01", "Sunday")).toBe("2026-11-01");
    expect(weekEnd("2026-11-01", "Sunday")).toBe("2026-11-07");
    expect(weekStart("2026-11-03", "Monday")).toBe("2026-11-02");
    expect(weekEnd("2026-11-03", "Monday")).toBe("2026-11-08");
  });

  it("keeps weeks stable across Auckland DST transitions", () => {
    // DST ends 2026-04-05 and starts 2026-09-27.
    expect(weekStart("2026-04-05", "Sunday")).toBe("2026-04-05");
    expect(weekEnd("2026-04-05", "Sunday")).toBe("2026-04-11");
    expect(weekStart("2026-04-07", "Monday")).toBe("2026-04-06");
    expect(weekEnd("2026-04-07", "Monday")).toBe("2026-04-12");
    expect(weekStart("2026-09-27", "Sunday")).toBe("2026-09-27");
    expect(weekEnd("2026-09-27", "Sunday")).toBe("2026-10-03");
    expect(weekStart("2026-09-29", "Monday")).toBe("2026-09-28");
    expect(weekEnd("2026-09-29", "Monday")).toBe("2026-10-04");
  });

  it("counts goal weeks correctly across DST transitions", () => {
    const base: Goal = {
      id: "x",
      name: "X",
      targetAmount: 200,
      savedAmount: 0,
      targetDate: "2026-03-16",
    };
    // New York spring forward inside a two-week span.
    expect(goalWeeklyContributionAsOf(base, "2026-03-02")).toBeCloseTo(100, 6);
    // New York fall back inside a two-week span.
    expect(
      goalWeeklyContributionAsOf({ ...base, targetDate: "2026-11-09" }, "2026-10-26"),
    ).toBeCloseTo(100, 6);
    // Auckland DST end inside a two-week span.
    expect(
      goalWeeklyContributionAsOf({ ...base, targetDate: "2026-04-13" }, "2026-03-30"),
    ).toBeCloseTo(100, 6);
    // Auckland DST start inside a two-week span.
    expect(
      goalWeeklyContributionAsOf({ ...base, targetDate: "2026-10-05" }, "2026-09-21"),
    ).toBeCloseTo(100, 6);
    // A single DST-crossing week is still one week.
    expect(
      goalWeeklyContributionAsOf(
        { ...base, targetAmount: 70, targetDate: "2026-03-09" },
        "2026-03-02",
      ),
    ).toBeCloseTo(70, 6);
  });
});

describe("integration: mock data through the whole chain", () => {
  it("keeps the weekly plan internally consistent", () => {
    const today = currentWeek.start;
    const planned = weeklyPlannedByType(categories, bills);
    const goalsNeeded = goals.reduce(
      (sum, goal) => sum + goalWeeklyContributionAsOf(goal, today),
      0,
    );
    const plan = {
      essentials: planned.essential,
      savings: planned.savings,
      goals: goalsNeeded,
      flexible: planned.flexible,
    };

    const essentialsSum = categories
      .filter((category) => category.type === "essential")
      .reduce((sum, category) => sum + categoryWeeklyPlanned(category, bills), 0);
    expect(planned.essential).toBeCloseTo(essentialsSum, 6);
    expect(weeklyEssentials(categories, bills)).toBeCloseTo(essentialsSum, 6);

    const income = incomeInWeek(incomeEntries, currentWeek.start);
    expect(income).toBeCloseTo(825, 6);

    const result = allocateWaterfall(income, plan);
    const buckets: (keyof typeof plan)[] = ["essentials", "savings", "goals", "flexible"];
    let allocatedTotal = 0;
    for (const bucket of buckets) {
      allocatedTotal += result.allocated[bucket];
      expect(result.allocated[bucket] + result.shortfall[bucket]).toBeCloseTo(plan[bucket], 6);
      expect(result.allocated[bucket]).toBeLessThanOrEqual(plan[bucket] + 1e-9);
    }
    expect(allocatedTotal + result.buffer).toBeCloseTo(income, 6);
    expect(result.allocated.essentials).toBeCloseTo(essentialsSum, 6);
    const planTotal = essentialsSum + planned.savings + goalsNeeded + planned.flexible;
    expect(result.buffer).toBeCloseTo(Math.max(0, income - planTotal), 6);
    // With the larger-of rule the flexible plan grows, so income no longer covers the plan.
    expect(planTotal).toBeGreaterThan(income);
    expect(result.buffer).toBeCloseTo(0, 6);
  });

  it("keeps the buffer and runway internally consistent", () => {
    const nextWeekStart = "2026-10-05";
    const buffer = bufferBalanceAsOf(
      settings.openingBufferBalance,
      incomeEntries,
      transactions,
      nextWeekStart,
    );
    const spentBefore = transactions
      .filter((transaction) => transaction.date < nextWeekStart)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const incomeBefore = incomeEntries
      .filter((entry) => entry.date < nextWeekStart)
      .reduce((sum, entry) => sum + entry.amount, 0);
    expect(buffer).toBeCloseTo(settings.openingBufferBalance + incomeBefore - spentBefore, 6);
    expect(buffer).toBeCloseTo(2987.1, 6);

    const change = bufferChangeInWeek(incomeEntries, transactions, currentWeek.start);
    expect(change).toBeCloseTo(
      incomeInWeek(incomeEntries, currentWeek.start) -
        spentInWeek(transactions, null, currentWeek.start),
      6,
    );

    const essentials = weeklyEssentials(categories, bills);
    const runway = runwayWeeksFromEssentials(buffer, essentials);
    expect(runway).not.toBeNull();
    if (runway !== null) {
      expect(runway).toBeCloseTo(buffer / essentials, 6);
      expect(runway).toBeGreaterThan(0);
    }
  });

  it("keeps safe-to-spend consistent with flexible spending", () => {
    const flexibleIds = categories
      .filter((category) => category.type === "flexible")
      .map((category) => category.id);
    const flexibleBudget = weeklyPlannedByType(categories, bills).flexible;
    const flexibleSpent = spentInWeek(transactions, flexibleIds, currentWeek.start);
    const remaining = safeToSpendAmount(flexibleBudget, flexibleSpent);
    expect(remaining).toBeCloseTo(flexibleBudget - flexibleSpent, 6);
    expect(safeToSpendStatus(remaining, flexibleBudget)).toBe(
      remaining < 0 ? "danger" : remaining > 0.2 * flexibleBudget ? "safe" : "caution",
    );
  });
});

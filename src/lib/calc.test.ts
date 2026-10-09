import { describe, expect, it } from "vitest";
import { bills, categories, incomeEntries, transactions } from "./mockData";
import type { Category, RecurringBill } from "./types";
import {
  categoryWeeklyPlanned,
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

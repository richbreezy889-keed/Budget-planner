import { describe, expect, it } from "vitest";
import { bills, categories } from "./mockData";
import type { Category, RecurringBill } from "./types";
import { categoryWeeklyPlanned, weekEnd, weekStart, weeklyEquivalent } from "./calc";

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

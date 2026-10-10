import { describe, expect, it } from "vitest";

import { starterCategories } from "./starter";

describe("starterCategories", () => {
  it("returns the eight expected templates with zero budgets", () => {
    const list = starterCategories();
    expect(list.map((category) => category.name)).toEqual([
      "Rent",
      "Groceries",
      "Transport",
      "Utilities",
      "Phone and internet",
      "Emergency fund",
      "Dining out",
      "Fun",
    ]);
    expect(list.every((category) => category.budgetAmount === 0)).toBe(true);
    expect(
      list.every(
        (category) => category.budgetPeriod === "weekly" || category.budgetPeriod === "monthly",
      ),
    ).toBe(true);
    expect(
      list.every(
        (category) =>
          category.type === "essential" ||
          category.type === "savings" ||
          category.type === "flexible",
      ),
    ).toBe(true);
  });

  it("classifies each template with the expected type and period", () => {
    const list = starterCategories();
    expect(list).toContainEqual({
      name: "Rent",
      type: "essential",
      budgetAmount: 0,
      budgetPeriod: "monthly",
    });
    expect(list).toContainEqual({
      name: "Groceries",
      type: "essential",
      budgetAmount: 0,
      budgetPeriod: "weekly",
    });
    expect(list).toContainEqual({
      name: "Emergency fund",
      type: "savings",
      budgetAmount: 0,
      budgetPeriod: "weekly",
    });
    expect(list).toContainEqual({
      name: "Dining out",
      type: "flexible",
      budgetAmount: 0,
      budgetPeriod: "weekly",
    });
  });

  it("has unique names", () => {
    const names = starterCategories().map((category) => category.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("returns a fresh copy each call", () => {
    const first = starterCategories();
    first[0]!.name = "Changed";
    first[0]!.budgetAmount = 999;
    const second = starterCategories();
    expect(second[0]!.name).toBe("Rent");
    expect(second[0]!.budgetAmount).toBe(0);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  AppData,
  Category,
  Goal,
  IncomeEntry,
  RecurringBill,
  Settings,
  Transaction,
} from "../types";
import { appReducer, id, type AppReducerResult } from "./reducer";
import { createSeedData } from "./seed";

const okData = (result: AppReducerResult): AppData => {
  if (!result.ok) throw new Error(`expected ok result, got error: ${result.error}`);
  return result.data;
};

const seed = (): AppData => createSeedData();

const income = (over: Partial<IncomeEntry> = {}): IncomeEntry => ({
  id: "i-new",
  date: "2026-10-05",
  amount: 100,
  source: "Gig",
  note: "n",
  ...over,
});

const transaction = (over: Partial<Transaction> = {}): Transaction => ({
  id: "t-new",
  date: "2026-10-05",
  amount: 12,
  categoryId: "coffee",
  note: "n",
  ...over,
});

const category = (over: Partial<Category> = {}): Category => ({
  id: "new-cat",
  name: "New",
  type: "flexible",
  budgetAmount: 10,
  budgetPeriod: "weekly",
  ...over,
});

const bill = (over: Partial<RecurringBill> = {}): RecurringBill => ({
  id: "b-new",
  name: "New bill",
  amount: 5,
  period: "weekly",
  categoryId: "coffee",
  dueDay: "Monday",
  ...over,
});

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: "g-new",
  name: "New goal",
  targetAmount: 100,
  savedAmount: 0,
  ...over,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("id", () => {
  it("uses crypto.randomUUID when available", () => {
    const spy = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("fixed-uuid" as never);
    expect(id()).toBe("fixed-uuid");
    spy.mockRestore();
  });

  it("falls back to a generated string when randomUUID is unavailable", () => {
    const spy = vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(() => {
      throw new Error("no uuid");
    });
    expect(id()).toMatch(/^id-/);
    spy.mockRestore();
  });

  it("returns unique values", () => {
    const values = new Set(Array.from({ length: 50 }, () => id()));
    expect(values.size).toBe(50);
  });
});

describe("income actions", () => {
  it("addIncome appends a row with a generated id", () => {
    const before = seed();
    const next = okData(
      appReducer(before, { type: "addIncome", item: income({ id: undefined as never }) }),
    );
    expect(next.incomeEntries).toHaveLength(before.incomeEntries.length + 1);
    const added = next.incomeEntries.at(-1);
    expect(added?.amount).toBe(100);
    expect(added?.id).toBeTruthy();
    expect(before.incomeEntries).toHaveLength(2);
  });

  it("updateIncome replaces the matching row", () => {
    const next = okData(
      appReducer(seed(), { type: "updateIncome", item: income({ id: "i1", amount: 999 }) }),
    );
    expect(next.incomeEntries.find((row) => row.id === "i1")?.amount).toBe(999);
  });

  it("deleteIncome removes the row", () => {
    const next = okData(appReducer(seed(), { type: "deleteIncome", id: "i1" }));
    expect(next.incomeEntries.map((row) => row.id)).toEqual(["i2"]);
  });
});

describe("transaction actions", () => {
  it("addTransaction appends a row with a generated id", () => {
    const before = seed();
    const next = okData(
      appReducer(before, { type: "addTransaction", item: transaction({ id: undefined as never }) }),
    );
    expect(next.transactions).toHaveLength(before.transactions.length + 1);
    expect(next.transactions.at(-1)?.id).toBeTruthy();
  });

  it("updateTransaction replaces the matching row", () => {
    const next = okData(
      appReducer(seed(), { type: "updateTransaction", item: transaction({ id: "t2", amount: 1 }) }),
    );
    expect(next.transactions.find((row) => row.id === "t2")?.amount).toBe(1);
  });

  it("deleteTransaction removes the row", () => {
    const next = okData(appReducer(seed(), { type: "deleteTransaction", id: "t2" }));
    expect(next.transactions.some((row) => row.id === "t2")).toBe(false);
  });
});

describe("category actions", () => {
  it("addCategory appends a row with a generated id", () => {
    const before = seed();
    const next = okData(
      appReducer(before, { type: "addCategory", item: category({ id: undefined as never }) }),
    );
    expect(next.categories).toHaveLength(before.categories.length + 1);
    expect(next.categories.at(-1)?.id).toBeTruthy();
  });

  it("updateCategory replaces the matching row", () => {
    const next = okData(
      appReducer(seed(), {
        type: "updateCategory",
        item: category({ id: "fun", name: "Fun money" }),
      }),
    );
    expect(next.categories.find((row) => row.id === "fun")?.name).toBe("Fun money");
  });

  it("deleteCategory removes a category that is not referenced", () => {
    const next = okData(appReducer(seed(), { type: "deleteCategory", id: "retirement" }));
    expect(next.categories.some((row) => row.id === "retirement")).toBe(false);
  });

  it("refuses to delete a category used by transactions", () => {
    const result = appReducer(seed(), { type: "deleteCategory", id: "groceries" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Groceries");
      expect(result.error).toContain("transaction");
    }
  });

  it("refuses to delete a category used by bills", () => {
    const result = appReducer(seed(), { type: "deleteCategory", id: "utilities" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Utilities");
      expect(result.error).toContain("bill");
    }
  });

  it("refuses and leaves state untouched (no orphans)", () => {
    const before = seed();
    const result = appReducer(before, { type: "deleteCategory", id: "groceries" });
    expect(result.ok).toBe(false);
    expect(before.categories.some((row) => row.id === "groceries")).toBe(true);
  });
});

describe("bill actions", () => {
  it("addBill appends a row with a generated id", () => {
    const before = seed();
    const next = okData(
      appReducer(before, { type: "addBill", item: bill({ id: undefined as never }) }),
    );
    expect(next.bills).toHaveLength(before.bills.length + 1);
    expect(next.bills.at(-1)?.id).toBeTruthy();
  });

  it("updateBill replaces the matching row", () => {
    const next = okData(
      appReducer(seed(), { type: "updateBill", item: bill({ id: "b5", amount: 99 }) }),
    );
    expect(next.bills.find((row) => row.id === "b5")?.amount).toBe(99);
  });

  it("deleteBill removes the row", () => {
    const next = okData(appReducer(seed(), { type: "deleteBill", id: "b5" }));
    expect(next.bills.some((row) => row.id === "b5")).toBe(false);
  });
});

describe("goal actions", () => {
  it("addGoal appends a row with a generated id", () => {
    const before = seed();
    const next = okData(
      appReducer(before, { type: "addGoal", item: goal({ id: undefined as never }) }),
    );
    expect(next.goals).toHaveLength(before.goals.length + 1);
    expect(next.goals.at(-1)?.id).toBeTruthy();
  });

  it("updateGoal replaces the matching row", () => {
    const next = okData(
      appReducer(seed(), { type: "updateGoal", item: goal({ id: "g3", savedAmount: 260 }) }),
    );
    expect(next.goals.find((row) => row.id === "g3")?.savedAmount).toBe(260);
  });

  it("deleteGoal removes the row", () => {
    const next = okData(appReducer(seed(), { type: "deleteGoal", id: "g3" }));
    expect(next.goals.some((row) => row.id === "g3")).toBe(false);
  });
});

describe("settings, replaceAll and startFresh", () => {
  it("setSettings replaces the settings object", () => {
    const settings: Settings = {
      currency: "GBP",
      weekStartDay: "Saturday",
      baselineWeeklyIncome: 700,
      openingBufferBalance: 100,
    };
    const next = okData(appReducer(seed(), { type: "setSettings", settings }));
    expect(next.settings).toEqual(settings);
  });

  it("replaceAll swaps in the provided dataset", () => {
    const replacement = seed();
    replacement.isDemo = false;
    const next = okData(appReducer(seed(), { type: "replaceAll", data: replacement }));
    expect(next).toBe(replacement);
  });

  it("startFresh clears the collections and marks non-demo", () => {
    const settings: Settings = {
      currency: "USD",
      weekStartDay: "Monday",
      baselineWeeklyIncome: 850,
      openingBufferBalance: 0,
    };
    const next = okData(appReducer(seed(), { type: "startFresh", settings }));
    expect(next.isDemo).toBe(false);
    expect(next.incomeEntries).toEqual([]);
    expect(next.categories).toEqual([]);
    expect(next.transactions).toEqual([]);
    expect(next.bills).toEqual([]);
    expect(next.goals).toEqual([]);
  });
});

describe("record validation", () => {
  it("refuses addIncome with a non-finite amount and leaves state untouched", () => {
    const before = seed();
    expect(appReducer(before, { type: "addIncome", item: income({ amount: Number.NaN }) }).ok).toBe(
      false,
    );
    expect(
      appReducer(before, {
        type: "addIncome",
        item: income({ amount: Number.POSITIVE_INFINITY }),
      }).ok,
    ).toBe(false);
    expect(before.incomeEntries).toHaveLength(2);
  });

  it("refuses addIncome with an invalid date", () => {
    const result = appReducer(seed(), { type: "addIncome", item: income({ date: "2026/10/05" }) });
    expect(result.ok).toBe(false);
  });

  it("refuses addTransaction that references an unknown category", () => {
    const result = appReducer(seed(), {
      type: "addTransaction",
      item: transaction({ categoryId: "nope" }),
    });
    expect(result.ok).toBe(false);
  });

  it("refuses updateTransaction that moves a row to an unknown category", () => {
    const result = appReducer(seed(), {
      type: "updateTransaction",
      item: transaction({ id: "t2", categoryId: "nope" }),
    });
    expect(result.ok).toBe(false);
  });

  it("refuses addBill that references an unknown category", () => {
    const result = appReducer(seed(), { type: "addBill", item: bill({ categoryId: "nope" }) });
    expect(result.ok).toBe(false);
  });

  it("refuses updateBill that moves a row to an unknown category", () => {
    const result = appReducer(seed(), {
      type: "updateBill",
      item: bill({ id: "b5", categoryId: "nope" }),
    });
    expect(result.ok).toBe(false);
  });

  it("refuses addCategory with an invalid type or period", () => {
    expect(
      appReducer(seed(), { type: "addCategory", item: category({ type: "weird" as never }) }).ok,
    ).toBe(false);
    expect(
      appReducer(seed(), {
        type: "addCategory",
        item: category({ budgetPeriod: "daily" as never }),
      }).ok,
    ).toBe(false);
  });

  it("refuses addGoal with a non-finite target", () => {
    const result = appReducer(seed(), {
      type: "addGoal",
      item: goal({ targetAmount: Number.NaN }),
    });
    expect(result.ok).toBe(false);
  });

  it("refuses setSettings with empty or non-finite values", () => {
    const empty = appReducer(seed(), {
      type: "setSettings",
      settings: {
        currency: "",
        weekStartDay: "Monday",
        baselineWeeklyIncome: 850,
        openingBufferBalance: 0,
      },
    });
    expect(empty.ok).toBe(false);

    const badNumber = appReducer(seed(), {
      type: "setSettings",
      settings: {
        currency: "USD",
        weekStartDay: "Monday",
        baselineWeeklyIncome: Number.NaN,
        openingBufferBalance: 0,
      },
    });
    expect(badNumber.ok).toBe(false);
  });

  it("refuses an update with an empty id and leaves state unchanged", () => {
    const before = seed();
    const result = appReducer(before, { type: "updateIncome", item: income({ id: "" }) });
    expect(result.ok).toBe(false);
    expect(before.incomeEntries).toHaveLength(2);
  });
});

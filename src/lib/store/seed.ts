import { bills, categories, goals, incomeEntries, settings, transactions } from "../mockData";
import type { AppData, Settings } from "../types";

/** The demo dataset used on a first run (and as a fallback for corrupt storage). */
export function createSeedData(): AppData {
  return {
    version: 1,
    isDemo: true,
    settings: { ...settings },
    incomeEntries: incomeEntries.map((entry) => ({ ...entry })),
    categories: categories.map((category) => ({ ...category })),
    transactions: transactions.map((transaction) => ({ ...transaction })),
    bills: bills.map((bill) => ({ ...bill })),
    goals: goals.map((goal) => ({ ...goal })),
  };
}

/** A blank, user-owned dataset starting from the given settings. */
export function startFresh(settings: Settings): AppData {
  return {
    version: 1,
    isDemo: false,
    settings: { ...settings },
    incomeEntries: [],
    categories: [],
    transactions: [],
    bills: [],
    goals: [],
  };
}

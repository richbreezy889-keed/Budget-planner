// Placeholder money calculations. Signatures are final; bodies return mock
// values and should be replaced with real logic.
import type { BillPeriod, Category, CategoryType, Goal, IncomeEntry, RecurringBill, Settings, Transaction } from "./types";

export type SafeStatus = "safe" | "caution" | "danger";
export type AllocationKey = "Essentials" | "Savings" | "Goals" | "Flexible" | "Buffer";
export interface Allocation { key: AllocationKey; amount: number }

export function weeklyEquivalent(amount: number, period: BillPeriod): number {
  return period === "weekly" ? amount : period === "monthly" ? amount * 0.2308 : amount * 0.0192; // mock
}

export function weeklyEssentials(_bills: RecurringBill[], _categories: Category[]): number { return 405; }

export function weeklyBillsTotal(_bills: RecurringBill[]): number { return 389.31; }

export function incomeForWeek(_entries: IncomeEntry[], _weekStart: string): number { return 825; }

export function flexibleBudgetForWeek(_categories: Category[]): number { return 260; }

export function safeToSpend(_settings: Settings, _entries: IncomeEntry[], _transactions: Transaction[], _categories: Category[], _bills: RecurringBill[], _goals: Goal[]): number {
  return 186;
}

export function safeStatus(_safeToSpend: number, _flexibleBudget: number): SafeStatus { return "safe"; }

export function weeklyWaterfall(_income: number, _categories: Category[], _bills: RecurringBill[], _goals: Goal[]): Allocation[] {
  return [
    { key: "Essentials", amount: 405 },
    { key: "Savings", amount: 130 },
    { key: "Goals", amount: 80 },
    { key: "Flexible", amount: 130 },
    { key: "Buffer", amount: 80 },
  ];
}

export function bufferBalance(_settings: Settings, _entries: IncomeEntry[], _transactions: Transaction[]): number { return 2915; }

export function bufferChangeThisWeek(_settings: Settings, _entries: IncomeEntry[]): number { return 80; }

export function runwayWeeks(_bufferBalance: number, _baselineWeeklyIncome: number): number { return 3.6; }

export function rollingAverageIncome(_entries: IncomeEntry[], weeks: number): number { return weeks === 4 ? 909 : 896; }

export function spentInCategory(categoryId: string, _transactions: Transaction[], _period: Category["budgetPeriod"]): number {
  const mock: Record<string, number> = { rent: 1450, groceries: 74.9, transport: 32, utilities: 98, emergency: 60, retirement: 150, dining: 41.5, coffee: 17.5, fun: 12 };
  return mock[categoryId] ?? 0;
}

export function categoryProgress(spent: number, budgetAmount: number): number { return Math.min(1, spent / budgetAmount); }

export function weeklyTotalForType(type: CategoryType, _categories: Category[]): number {
  return ({ essential: 405, savings: 129, flexible: 130 } as const)[type];
}

export function goalProgress(goal: Goal): number { return goal.savedAmount / goal.targetAmount; }

export function goalWeeklyContribution(goal: Goal): number {
  return ({ g1: 40, g2: 25, g3: 15 } as Record<string, number>)[goal.id] ?? 0;
}

export function weeksToGoal(goal: Goal): number {
  return ({ g1: 17, g2: 41, g3: 3 } as Record<string, number>)[goal.id] ?? 0;
}

// Placeholder money calculations. All return mock values — implement later.
import { settings, type Category, type Bill } from "./mockData";

export type SafeStatus = "safe" | "caution" | "danger";

export interface Allocation { key: "Essentials" | "Savings" | "Goals" | "Flexible" | "Buffer"; amount: number }

export function formatMoney(value: number, opts: { cents?: boolean; sign?: boolean } = {}): string {
  const abs = Math.abs(value);
  const s = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: settings.currency,
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  }).format(abs);
  if (value < 0) return `−${s}`;
  return opts.sign ? `+${s}` : s;
}

export function getSafeToSpend(): number { return 186; }
export function getFlexibleBudgetThisWeek(): number { return 260; }
export function getSafeStatus(): SafeStatus { return "safe"; }
export function getIncomeThisWeek(): number { return 825; }
export function getIncomeEntryCount(): number { return 2; }

export function getWaterfall(): Allocation[] {
  return [
    { key: "Essentials", amount: 405 },
    { key: "Savings", amount: 130 },
    { key: "Goals", amount: 80 },
    { key: "Flexible", amount: 130 },
    { key: "Buffer", amount: 80 },
  ];
}

export function getBufferBalance(): number { return 2915; }
export function getRunwayWeeks(): number { return 3.6; }
export function getAverageIncome(_weeks: 4 | 8): number { return _weeks === 4 ? 909 : 896; }
export function getBaseline(): number { return settings.baselineWeeklyIncome; }

export function weeklyEquivalent(_bill: Pick<Bill, "amount" | "period">): number {
  const map: Record<string, number> = { b1: 334.62, b2: 19.62, b3: 12.69, b4: 6.92, b5: 12, b6: 3.46 };
  return map[(_bill as Bill).id] ?? _bill.amount;
}
export function getTotalWeeklyBills(): number { return 389.31; }

export function getCategoryProgress(c: Category): number {
  return Math.min(1, c.spent / c.amount); // mock ratio
}
export function getGroupTotal(_group: string): number {
  return ({ Essential: 405, Savings: 129, Flexible: 130 } as Record<string, number>)[_group] ?? 0;
}
export function getGoalProgress(saved: number, target: number): number { return saved / target; }
export function getWeeksToGoal(_goalId: string): number {
  return ({ g1: 17, g2: 41, g3: 3 } as Record<string, number>)[_goalId] ?? 0;
}

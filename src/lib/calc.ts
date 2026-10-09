// Placeholder money calculations. Signatures are final; bodies return mock
// values and should be replaced with real logic.
import type {
  BillPeriod,
  Category,
  CategoryType,
  Goal,
  IncomeEntry,
  ISODate,
  RecurringBill,
  Settings,
  Transaction,
  WeekStartDay,
} from "./types";

export type SafeStatus = "safe" | "caution" | "danger";
export type AllocationKey = "Essentials" | "Savings" | "Goals" | "Flexible" | "Buffer";
export interface Allocation {
  key: AllocationKey;
  amount: number;
}

export function weeklyEquivalent(amount: number, period: BillPeriod): number {
  if (period === "weekly") return amount;
  if (period === "monthly") return (amount * 12) / 52;
  return amount / 52;
}

export interface PlannedByType {
  essential: number;
  savings: number;
  flexible: number;
  weeklyEssentials: number;
}

export function weeklyPlannedByType(categories: Category[], bills: RecurringBill[]): PlannedByType {
  const sums: Record<CategoryType, number> = { essential: 0, savings: 0, flexible: 0 };
  for (const category of categories) {
    sums[category.type] += categoryWeeklyPlanned(category, bills);
  }
  return {
    essential: sums.essential,
    savings: sums.savings,
    flexible: sums.flexible,
    weeklyEssentials: sums.essential,
  };
}

export function weeklyEssentials(categories: Category[], bills: RecurringBill[]): number {
  return weeklyPlannedByType(categories, bills).essential;
}

export function weeklyBillsTotal(_bills: RecurringBill[]): number {
  return 389.31;
}

export function incomeForWeek(_entries: IncomeEntry[], _weekStart: string): number {
  return 825;
}

export function flexibleBudgetForWeek(_categories: Category[]): number {
  return 260;
}

export function safeToSpend(
  _settings: Settings,
  _entries: IncomeEntry[],
  _transactions: Transaction[],
  _categories: Category[],
  _bills: RecurringBill[],
  _goals: Goal[],
): number {
  return 186;
}

export function safeStatus(_safeToSpend: number, _flexibleBudget: number): SafeStatus {
  return "safe";
}

export function weeklyWaterfall(
  _income: number,
  _categories: Category[],
  _bills: RecurringBill[],
  _goals: Goal[],
): Allocation[] {
  return [
    { key: "Essentials", amount: 405 },
    { key: "Savings", amount: 130 },
    { key: "Goals", amount: 80 },
    { key: "Flexible", amount: 130 },
    { key: "Buffer", amount: 80 },
  ];
}

export function bufferBalance(
  _settings: Settings,
  _entries: IncomeEntry[],
  _transactions: Transaction[],
): number {
  return 2915;
}

export function bufferChangeThisWeek(_settings: Settings, _entries: IncomeEntry[]): number {
  return 80;
}

export function runwayWeeks(_bufferBalance: number, _baselineWeeklyIncome: number): number {
  return 3.6;
}

export function rollingAverageIncome(_entries: IncomeEntry[], weeks: number): number {
  return weeks === 4 ? 909 : 896;
}

export function spentInCategory(
  categoryId: string,
  _transactions: Transaction[],
  _period: Category["budgetPeriod"],
): number {
  const mock: Record<string, number> = {
    rent: 1450,
    groceries: 74.9,
    transport: 32,
    utilities: 98,
    emergency: 60,
    retirement: 150,
    dining: 41.5,
    coffee: 17.5,
    fun: 12,
  };
  return mock[categoryId] ?? 0;
}

export function categoryProgress(spent: number, budgetAmount: number): number {
  return Math.min(1, spent / budgetAmount);
}

export function weeklyTotalForType(type: CategoryType, _categories: Category[]): number {
  return ({ essential: 405, savings: 129, flexible: 130 } as const)[type];
}

export function goalProgress(goal: Goal): number {
  return goal.savedAmount / goal.targetAmount;
}

export function goalWeeklyContribution(goal: Goal): number {
  return ({ g1: 40, g2: 25, g3: 15 } as Record<string, number>)[goal.id] ?? 0;
}

export function weeksToGoal(goal: Goal): number {
  return ({ g1: 17, g2: 41, g3: 3 } as Record<string, number>)[goal.id] ?? 0;
}

function parseLocalDate(iso: ISODate): Date {
  const parts = iso.split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

const weekStartIndex: Record<WeekStartDay, number> = { Sunday: 0, Monday: 1, Saturday: 6 };

export function weekStart(date: ISODate, weekStartDay: WeekStartDay): ISODate {
  const d = parseLocalDate(date);
  const diff = (d.getDay() - weekStartIndex[weekStartDay] + 7) % 7;
  return toISODate(addDays(d, -diff));
}

export function weekEnd(date: ISODate, weekStartDay: WeekStartDay): ISODate {
  return toISODate(addDays(parseLocalDate(weekStart(date, weekStartDay)), 6));
}

export function categoryWeeklyPlanned(category: Category, bills: RecurringBill[]): number {
  const linked = bills.filter((bill) => bill.categoryId === category.id);
  if (linked.length > 0) {
    return linked.reduce((sum, bill) => sum + weeklyEquivalent(bill.amount, bill.period), 0);
  }
  return weeklyEquivalent(category.budgetAmount, category.budgetPeriod);
}

function isInWeek(date: ISODate, weekStartDate: ISODate): boolean {
  const end = toISODate(addDays(parseLocalDate(weekStartDate), 6));
  return date >= weekStartDate && date <= end;
}

export function incomeInWeek(entries: IncomeEntry[], weekStartDate: ISODate): number {
  return entries
    .filter((entry) => isInWeek(entry.date, weekStartDate))
    .reduce((sum, entry) => sum + entry.amount, 0);
}

export function spentInWeek(
  transactions: Transaction[],
  categoryIds: string[] | null,
  weekStartDate: ISODate,
): number {
  return transactions
    .filter((transaction) => isInWeek(transaction.date, weekStartDate))
    .filter((transaction) => categoryIds === null || categoryIds.includes(transaction.categoryId))
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

function daysBetween(from: ISODate, to: ISODate): number {
  const ms = parseLocalDate(to).getTime() - parseLocalDate(from).getTime();
  return Math.round(ms / 86400000);
}

export function goalWeeklyContributionAsOf(goal: Goal, today: ISODate): number {
  if (!goal.targetDate) return 0;
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
  const weeksLeft = Math.max(1, Math.ceil(daysBetween(today, goal.targetDate) / 7));
  return remaining / weeksLeft;
}

export type WaterfallBucket = "essentials" | "savings" | "goals" | "flexible";

export interface WaterfallPlan {
  essentials: number;
  savings: number;
  goals: number;
  flexible: number;
}

export interface WaterfallResult {
  allocated: Record<WaterfallBucket, number>;
  buffer: number;
  shortfall: Record<WaterfallBucket, number>;
}

const waterfallOrder: WaterfallBucket[] = ["essentials", "savings", "goals", "flexible"];

export function allocateWaterfall(income: number, plan: WaterfallPlan): WaterfallResult {
  const allocated: Record<WaterfallBucket, number> = {
    essentials: 0,
    savings: 0,
    goals: 0,
    flexible: 0,
  };
  const shortfall: Record<WaterfallBucket, number> = {
    essentials: 0,
    savings: 0,
    goals: 0,
    flexible: 0,
  };
  let remaining = income;
  for (const bucket of waterfallOrder) {
    const need = plan[bucket];
    const give = Math.max(0, Math.min(remaining, need));
    allocated[bucket] = give;
    shortfall[bucket] = need - give;
    remaining -= give;
  }
  return { allocated, buffer: Math.max(0, remaining), shortfall };
}

export function bufferBalanceAsOf(
  openingBalance: number,
  incomeEntries: IncomeEntry[],
  transactions: Transaction[],
  asOfWeekStart: ISODate,
): number {
  const incomeBefore = incomeEntries
    .filter((entry) => entry.date < asOfWeekStart)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const spentBefore = transactions
    .filter((transaction) => transaction.date < asOfWeekStart)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  return openingBalance + incomeBefore - spentBefore;
}

export function bufferChangeInWeek(
  incomeEntries: IncomeEntry[],
  transactions: Transaction[],
  weekStartDate: ISODate,
): number {
  return (
    incomeInWeek(incomeEntries, weekStartDate) - spentInWeek(transactions, null, weekStartDate)
  );
}

export function runwayWeeksFromEssentials(buffer: number, essentials: number): number | null {
  if (essentials <= 0) return null;
  if (buffer <= 0) return 0;
  return buffer / essentials;
}

function weekStartRelativeTo(entryDate: ISODate, referenceWeekStart: ISODate): ISODate {
  const reference = parseLocalDate(referenceWeekStart);
  const diff = Math.round((parseLocalDate(entryDate).getTime() - reference.getTime()) / 86400000);
  return toISODate(addDays(reference, Math.floor(diff / 7) * 7));
}

export function rollingAverageIncomeAsOf(
  entries: IncomeEntry[],
  weeks: number,
  asOfWeekStart: ISODate,
): number | null {
  if (weeks <= 0 || entries.length === 0) return null;
  const firstEntryWeek = entries
    .map((entry) => weekStartRelativeTo(entry.date, asOfWeekStart))
    .reduce((min, week) => (week < min ? week : min));
  const reference = parseLocalDate(asOfWeekStart);
  const available: ISODate[] = [];
  for (let k = 1; k <= weeks; k++) {
    const start = toISODate(addDays(reference, -7 * k));
    if (start >= firstEntryWeek) available.push(start);
  }
  if (available.length === 0) return null;
  const total = available.reduce((sum, start) => sum + incomeInWeek(entries, start), 0);
  return total / available.length;
}

export function suggestedBaseline(entries: IncomeEntry[], asOfWeekStart: ISODate): number | null {
  if (entries.length === 0) return null;
  const firstEntryWeek = entries
    .map((entry) => weekStartRelativeTo(entry.date, asOfWeekStart))
    .reduce((min, week) => (week < min ? week : min));
  const reference = parseLocalDate(asOfWeekStart);
  const available: number[] = [];
  for (let k = 1; k <= 8; k++) {
    const start = toISODate(addDays(reference, -7 * k));
    if (start >= firstEntryWeek) available.push(incomeInWeek(entries, start));
  }
  if (available.length < 4) return null;
  const lowestFour = [...available].sort((a, b) => a - b).slice(0, 4);
  return lowestFour.reduce((sum, value) => sum + value, 0) / 4;
}

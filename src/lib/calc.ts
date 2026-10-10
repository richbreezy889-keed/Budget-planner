// Pure money and date calculations for the budget engine.
// ISO date-only strings are parsed as LOCAL dates (never shifted through UTC),
// and no monetary rounding happens here — round only when formatting via formatMoney.
import type {
  BillPeriod,
  Category,
  CategoryType,
  Goal,
  IncomeEntry,
  ISODate,
  RecurringBill,
  Transaction,
  WeekStartDay,
} from "./types";

export type SafeStatus = "safe" | "caution" | "danger";

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

export function spentInCategory(
  categoryId: string,
  transactions: Transaction[],
  period: Category["budgetPeriod"],
  asOfDate?: ISODate,
  weekStartDay: WeekStartDay = "Monday",
): number {
  if (transactions.length === 0) return 0;
  const latest = transactions.reduce<ISODate>(
    (max, transaction) => (transaction.date > max ? transaction.date : max),
    transactions[0]?.date ?? "",
  );
  const reference = asOfDate ?? latest;
  const scoped = transactions.filter((transaction) => transaction.categoryId === categoryId);
  if (period === "weekly") {
    const start = weekStart(reference, weekStartDay);
    return scoped
      .filter((transaction) => isInWeek(transaction.date, start))
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  }
  const month = reference.slice(0, 7);
  return scoped
    .filter((transaction) => transaction.date.slice(0, 7) === month)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

export function categoryProgress(spent: number, budgetAmount: number): number {
  if (Number.isNaN(budgetAmount) || budgetAmount <= 0) {
    return spent > 0 ? 1 : 0;
  }
  const ratio = spent / budgetAmount;
  if (!Number.isFinite(ratio)) return 0;
  return Math.min(1, ratio);
}

export function goalProgress(goal: Goal): number {
  return goal.savedAmount / goal.targetAmount;
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
  const billsTotal = bills
    .filter((bill) => bill.categoryId === category.id)
    .reduce((sum, bill) => sum + weeklyEquivalent(bill.amount, bill.period), 0);
  const budgetWeekly = weeklyEquivalent(category.budgetAmount, category.budgetPeriod);
  return Math.max(billsTotal, budgetWeekly);
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

export interface WeeklySeriesPoint {
  weekStart: ISODate;
  income: number;
  spending: number;
}

export function weeklySeries(
  entries: IncomeEntry[],
  transactions: Transaction[],
  weeks: number,
  asOfWeekStart: ISODate,
  includeCurrentWeek = true,
): WeeklySeriesPoint[] {
  const points: WeeklySeriesPoint[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const offset = includeCurrentWeek ? i : i + 1;
    const start = toISODate(addDays(parseLocalDate(asOfWeekStart), -7 * offset));
    points.push({
      weekStart: start,
      income: incomeInWeek(entries, start),
      spending: spentInWeek(transactions, null, start),
    });
  }
  return points;
}

export interface MonthlyRollupPoint {
  month: string;
  income: number;
  spending: number;
  net: number;
}

export function monthlyRollup(
  entries: IncomeEntry[],
  transactions: Transaction[],
  months: number,
  asOfDate: ISODate,
): MonthlyRollupPoint[] {
  const reference = parseLocalDate(`${asOfDate.slice(0, 7)}-01`);
  const points: MonthlyRollupPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(reference.getFullYear(), reference.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const income = entries
      .filter((entry) => entry.date.slice(0, 7) === month)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const spending = transactions
      .filter((transaction) => transaction.date.slice(0, 7) === month)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    points.push({ month, income, spending, net: income - spending });
  }
  return points;
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

export function safeToSpendAmount(
  flexibleBudgetWeekly: number,
  flexibleSpentThisWeek: number,
): number {
  return flexibleBudgetWeekly - flexibleSpentThisWeek;
}

export function safeToSpendStatus(remaining: number, flexibleBudgetWeekly: number): SafeStatus {
  if (remaining < 0) return "danger";
  if (remaining > 0.2 * flexibleBudgetWeekly) return "safe";
  return "caution";
}

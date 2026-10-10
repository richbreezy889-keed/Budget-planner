import {
  allocateWaterfall,
  bufferBalanceAsOf,
  bufferChangeInWeek,
  goalWeeklyContributionAsOf,
  incomeInWeek,
  rollingAverageIncomeAsOf,
  runwayWeeksFromEssentials,
  safeToSpendAmount,
  safeToSpendStatus,
  spentInWeek,
  suggestedBaseline,
  weekEnd,
  weeklyEssentials,
  weeklyPlannedByType,
  weeklySeries,
  weekStart,
} from "./calc";
import type { SafeStatus, WaterfallPlan, WaterfallResult, WeeklySeriesPoint } from "./calc";
import type { AppData, Goal, IncomeEntry, ISODate, Transaction } from "./types";

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

function daysBetween(from: ISODate, to: ISODate): number {
  const millisPerDay = 24 * 60 * 60 * 1000;
  return Math.round((parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) / millisPerDay);
}

function shiftDate(date: ISODate, days: number): ISODate {
  return toISODate(addDays(parseLocalDate(date), days));
}

function latestActivity(data: AppData, today: ISODate): ISODate {
  const dates = [
    ...data.incomeEntries.map((entry) => entry.date),
    ...data.transactions.map((transaction) => transaction.date),
  ];
  if (dates.length === 0) return today;
  return [...dates].sort()[dates.length - 1]!;
}

export function demoView(data: AppData, today: ISODate): AppData {
  if (!data.isDemo) return data;
  const demoWeekStart = weekStart(latestActivity(data, today), "Monday");
  const realWeekStart = weekStart(today, "Monday");
  const shiftDays = Math.floor(daysBetween(demoWeekStart, realWeekStart) / 7) * 7;
  if (shiftDays === 0) return data;

  const shiftIncome = (entry: IncomeEntry): IncomeEntry => ({
    ...entry,
    date: shiftDate(entry.date, shiftDays),
  });
  const shiftTransaction = (transaction: Transaction): Transaction => ({
    ...transaction,
    date: shiftDate(transaction.date, shiftDays),
  });
  const shiftGoal = (goal: Goal): Goal =>
    goal.targetDate === undefined
      ? goal
      : { ...goal, targetDate: shiftDate(goal.targetDate, shiftDays) };

  return {
    ...data,
    incomeEntries: data.incomeEntries.map(shiftIncome),
    transactions: data.transactions.map(shiftTransaction),
    goals: data.goals.map(shiftGoal),
  };
}

function weeklyPlan(data: AppData, today: ISODate): WaterfallPlan {
  const planned = weeklyPlannedByType(data.categories, data.bills);
  const goals = data.goals.reduce((sum, goal) => sum + goalWeeklyContributionAsOf(goal, today), 0);
  return {
    essentials: planned.essential,
    savings: planned.savings,
    goals,
    flexible: planned.flexible,
  };
}

export interface WeekActivityItem {
  kind: "income" | "spend";
  id: string;
  date: ISODate;
  amount: number;
  note: string;
  categoryId?: string;
}

export interface ThisWeekView {
  weekStart: ISODate;
  weekEnd: ISODate;
  incomeLogged: number;
  incomeEntryCount: number;
  hasIncome: boolean;
  plan: WaterfallPlan;
  waterfall: WaterfallResult;
  flexibleBudget: number;
  flexibleSpent: number;
  safeToSpend: number;
  status: SafeStatus;
  flexibleShortfall: number;
  activity: WeekActivityItem[];
}

export function thisWeekView(data: AppData, today: ISODate): ThisWeekView {
  const start = weekStart(today, data.settings.weekStartDay);
  const end = weekEnd(today, data.settings.weekStartDay);
  const inWeek = (date: ISODate): boolean => date >= start && date <= end;
  const plan = weeklyPlan(data, today);
  const incomeLogged = incomeInWeek(data.incomeEntries, start);
  const waterfall = allocateWaterfall(incomeLogged, plan);
  const flexibleIds = data.categories
    .filter((category) => category.type === "flexible")
    .map((category) => category.id);
  const flexibleSpent = spentInWeek(data.transactions, flexibleIds, start);
  const safeToSpend = safeToSpendAmount(plan.flexible, flexibleSpent);

  const activity: WeekActivityItem[] = [];
  for (const entry of data.incomeEntries) {
    if (inWeek(entry.date)) {
      activity.push({
        kind: "income",
        id: entry.id,
        date: entry.date,
        amount: entry.amount,
        note: entry.note,
      });
    }
  }
  for (const transaction of data.transactions) {
    if (inWeek(transaction.date)) {
      activity.push({
        kind: "spend",
        id: transaction.id,
        date: transaction.date,
        amount: transaction.amount,
        note: transaction.note,
        categoryId: transaction.categoryId,
      });
    }
  }
  activity.sort((a, b) =>
    a.date === b.date ? a.id.localeCompare(b.id) : a.date < b.date ? 1 : -1,
  );

  return {
    weekStart: start,
    weekEnd: end,
    incomeLogged,
    incomeEntryCount: data.incomeEntries.filter((entry) => inWeek(entry.date)).length,
    hasIncome: incomeLogged > 0,
    plan,
    waterfall,
    flexibleBudget: plan.flexible,
    flexibleSpent,
    safeToSpend,
    status: safeToSpendStatus(safeToSpend, plan.flexible),
    flexibleShortfall: waterfall.shortfall.flexible,
    activity,
  };
}

export interface BufferView {
  bufferBalance: number;
  changeThisWeek: number;
  essentialsWeekly: number;
  runwayWeeks: number | null;
  avg4: number | null;
  avg8: number | null;
  baseline: number;
  suggestedBaseline: number | null;
  avg4VsBaseline: "above" | "below" | "equal" | null;
  series: WeeklySeriesPoint[];
}

export function bufferView(data: AppData, today: ISODate): BufferView {
  const start = weekStart(today, data.settings.weekStartDay);
  const bufferBalance = bufferBalanceAsOf(
    data.settings.openingBufferBalance,
    data.incomeEntries,
    data.transactions,
    start,
  );
  const changeThisWeek = bufferChangeInWeek(data.incomeEntries, data.transactions, start);
  const essentialsWeekly = weeklyEssentials(data.categories, data.bills);
  const avg4 = rollingAverageIncomeAsOf(data.incomeEntries, 4, start);
  const avg8 = rollingAverageIncomeAsOf(data.incomeEntries, 8, start);
  const baseline = data.settings.baselineWeeklyIncome;
  const suggested = suggestedBaseline(data.incomeEntries, start);
  const avg4VsBaseline: BufferView["avg4VsBaseline"] =
    avg4 === null ? null : avg4 > baseline ? "above" : avg4 < baseline ? "below" : "equal";

  return {
    bufferBalance,
    changeThisWeek,
    essentialsWeekly,
    runwayWeeks: runwayWeeksFromEssentials(bufferBalance, essentialsWeekly),
    avg4,
    avg8,
    baseline,
    suggestedBaseline: suggested,
    avg4VsBaseline,
    series: weeklySeries(data.incomeEntries, data.transactions, 12, start),
  };
}

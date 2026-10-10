import { weekStart } from "./calc";
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

import type {
  Category,
  Goal,
  IncomeEntry,
  ISODate,
  RecurringBill,
  Settings,
  Transaction,
} from "./types";

export const settings: Settings = {
  currency: "USD",
  weekStartDay: "Monday",
  baselineWeeklyIncome: 850,
  openingBufferBalance: 2400,
};

export const currentWeek: { start: ISODate; end: ISODate; number: number } = {
  start: "2026-09-28",
  end: "2026-10-04",
  number: 40,
};

export const categories: Category[] = [
  { id: "rent", name: "Rent", type: "essential", budgetAmount: 1450, budgetPeriod: "monthly" },
  {
    id: "groceries",
    name: "Groceries",
    type: "essential",
    budgetAmount: 110,
    budgetPeriod: "weekly",
  },
  {
    id: "transport",
    name: "Transport",
    type: "essential",
    budgetAmount: 45,
    budgetPeriod: "weekly",
  },
  {
    id: "utilities",
    name: "Utilities",
    type: "essential",
    budgetAmount: 160,
    budgetPeriod: "monthly",
  },
  {
    id: "emergency",
    name: "Emergency fund",
    type: "savings",
    budgetAmount: 60,
    budgetPeriod: "weekly",
  },
  {
    id: "retirement",
    name: "Retirement",
    type: "savings",
    budgetAmount: 300,
    budgetPeriod: "monthly",
  },
  { id: "dining", name: "Dining out", type: "flexible", budgetAmount: 60, budgetPeriod: "weekly" },
  { id: "coffee", name: "Coffee", type: "flexible", budgetAmount: 20, budgetPeriod: "weekly" },
  { id: "fun", name: "Hobbies & fun", type: "flexible", budgetAmount: 50, budgetPeriod: "weekly" },
];

export const incomeEntries: IncomeEntry[] = [
  {
    id: "i1",
    date: "2026-09-28",
    amount: 640,
    source: "Freelance",
    note: "Freelance payout · Nova Design",
  },
  { id: "i2", date: "2026-09-30", amount: 185, source: "Delivery", note: "Delivery shift tips" },
];

export const transactions: Transaction[] = [
  { id: "t2", date: "2026-09-28", amount: 32, categoryId: "transport", note: "Metro card top-up" },
  {
    id: "t3",
    date: "2026-09-29",
    amount: 52.4,
    categoryId: "groceries",
    note: "Greenfield Market",
  },
  { id: "t5", date: "2026-09-30", amount: 41.5, categoryId: "dining", note: "Thai with Sam" },
  {
    id: "t6",
    date: "2026-10-01",
    amount: 17.5,
    categoryId: "coffee",
    note: "Corner cafe, flat white ×3",
  },
  { id: "t7", date: "2026-10-01", amount: 22.5, categoryId: "groceries", note: "Farmers market" },
  {
    id: "t8",
    date: "2026-10-02",
    amount: 60,
    categoryId: "emergency",
    note: "Emergency fund transfer",
  },
  { id: "t9", date: "2026-10-02", amount: 12, categoryId: "fun", note: "Paint & brushes" },
];

export const bills: RecurringBill[] = [
  {
    id: "b1",
    name: "Rent · Riverside flat",
    amount: 1450,
    period: "monthly",
    categoryId: "rent",
    dueDay: "1st",
  },
  {
    id: "b2",
    name: "Electricity",
    amount: 85,
    period: "monthly",
    categoryId: "utilities",
    dueDay: "12th",
  },
  {
    id: "b3",
    name: "Internet",
    amount: 55,
    period: "monthly",
    categoryId: "utilities",
    dueDay: "18th",
  },
  {
    id: "b4",
    name: "Phone plan",
    amount: 30,
    period: "monthly",
    categoryId: "utilities",
    dueDay: "22nd",
  },
  { id: "b5", name: "Gym", amount: 12, period: "weekly", categoryId: "fun", dueDay: "Monday" },
  {
    id: "b6",
    name: "Renter's insurance",
    amount: 180,
    period: "yearly",
    categoryId: "utilities",
    dueDay: "Mar 3",
  },
];

export const goals: Goal[] = [
  {
    id: "g1",
    name: "Lisbon trip",
    targetAmount: 1800,
    savedAmount: 1120,
    targetDate: "2027-04-01",
  },
  { id: "g2", name: "New laptop", targetAmount: 1400, savedAmount: 380, targetDate: "2027-06-15" },
  { id: "g3", name: "Bike repair", targetAmount: 260, savedAmount: 215, targetDate: "2026-11-01" },
];

/** Past weeks' totals for charts (display-only history). */
export const weeklyHistory: { weekStart: ISODate; income: number; spending: number }[] = [
  { weekStart: "2026-07-13", income: 920, spending: 780 },
  { weekStart: "2026-07-20", income: 610, spending: 740 },
  { weekStart: "2026-07-27", income: 1180, spending: 820 },
  { weekStart: "2026-08-03", income: 840, spending: 760 },
  { weekStart: "2026-08-10", income: 530, spending: 690 },
  { weekStart: "2026-08-17", income: 1020, spending: 805 },
  { weekStart: "2026-08-24", income: 960, spending: 770 },
  { weekStart: "2026-08-31", income: 720, spending: 745 },
  { weekStart: "2026-09-07", income: 1240, spending: 860 },
  { weekStart: "2026-09-14", income: 880, spending: 790 },
  { weekStart: "2026-09-21", income: 690, spending: 730 },
  { weekStart: "2026-09-28", income: 825, spending: 238 },
];

export const monthlyRollup: { month: string; income: number; spending: number; saved: number }[] = [
  { month: "June 2026", income: 3720, spending: 3290, saved: 430 },
  { month: "July 2026", income: 3850, spending: 3410, saved: 440 },
  { month: "August 2026", income: 3270, spending: 3215, saved: 55 },
  { month: "September 2026", income: 3810, spending: 3380, saved: 430 },
];

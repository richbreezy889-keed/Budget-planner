export type Group = "Essential" | "Savings" | "Flexible";
export type Period = "weekly" | "monthly";

export interface Category { id: string; name: string; group: Group; amount: number; period: Period; spent: number }
export interface Transaction { id: string; date: string; note: string; categoryId: string | "income"; amount: number }
export interface Bill { id: string; name: string; amount: number; period: Period | "yearly"; dueDay: string }
export interface Goal { id: string; name: string; target: number; saved: number; weeklyContribution: number; targetDate: string }
export interface WeekIncome { weekStart: string; income: number; spending: number }

export const settings = {
  currency: "USD",
  weekStart: "Monday",
  baselineWeeklyIncome: 850,
  openingBuffer: 2400,
};

export const currentWeek = { start: "2026-09-28", end: "2026-10-04", number: 40 };

export const categories: Category[] = [
  { id: "rent", name: "Rent", group: "Essential", amount: 1450, period: "monthly", spent: 1450 },
  { id: "groceries", name: "Groceries", group: "Essential", amount: 110, period: "weekly", spent: 74.9 },
  { id: "transport", name: "Transport", group: "Essential", amount: 45, period: "weekly", spent: 32 },
  { id: "utilities", name: "Utilities", group: "Essential", amount: 160, period: "monthly", spent: 98 },
  { id: "emergency", name: "Emergency fund", group: "Savings", amount: 60, period: "weekly", spent: 60 },
  { id: "retirement", name: "Retirement", group: "Savings", amount: 300, period: "monthly", spent: 150 },
  { id: "dining", name: "Dining out", group: "Flexible", amount: 60, period: "weekly", spent: 41.5 },
  { id: "coffee", name: "Coffee", group: "Flexible", amount: 20, period: "weekly", spent: 17.5 },
  { id: "fun", name: "Hobbies & fun", group: "Flexible", amount: 50, period: "weekly", spent: 12 },
];

export const transactions: Transaction[] = [
  { id: "t1", date: "2026-09-28", note: "Freelance payout · Nova Design", categoryId: "income", amount: 640 },
  { id: "t2", date: "2026-09-28", note: "Metro card top-up", categoryId: "transport", amount: -32 },
  { id: "t3", date: "2026-09-29", note: "Greenfield Market", categoryId: "groceries", amount: -52.4 },
  { id: "t4", date: "2026-09-30", note: "Delivery shift tips", categoryId: "income", amount: 185 },
  { id: "t5", date: "2026-09-30", note: "Thai with Sam", categoryId: "dining", amount: -41.5 },
  { id: "t6", date: "2026-10-01", note: "Corner cafe, flat white ×3", categoryId: "coffee", amount: -17.5 },
  { id: "t7", date: "2026-10-01", note: "Farmers market", categoryId: "groceries", amount: -22.5 },
  { id: "t8", date: "2026-10-02", note: "Emergency fund transfer", categoryId: "emergency", amount: -60 },
  { id: "t9", date: "2026-10-02", note: "Paint & brushes", categoryId: "fun", amount: -12 },
];

export const bills: Bill[] = [
  { id: "b1", name: "Rent · Riverside flat", amount: 1450, period: "monthly", dueDay: "1st" },
  { id: "b2", name: "Electricity", amount: 85, period: "monthly", dueDay: "12th" },
  { id: "b3", name: "Internet", amount: 55, period: "monthly", dueDay: "18th" },
  { id: "b4", name: "Phone plan", amount: 30, period: "monthly", dueDay: "22nd" },
  { id: "b5", name: "Gym", amount: 12, period: "weekly", dueDay: "Monday" },
  { id: "b6", name: "Renter's insurance", amount: 180, period: "yearly", dueDay: "Mar 3" },
];

export const goals: Goal[] = [
  { id: "g1", name: "Lisbon trip", target: 1800, saved: 1120, weeklyContribution: 40, targetDate: "2027-04-01" },
  { id: "g2", name: "New laptop", target: 1400, saved: 380, weeklyContribution: 25, targetDate: "2027-06-15" },
  { id: "g3", name: "Bike repair", target: 260, saved: 215, weeklyContribution: 15, targetDate: "2026-11-01" },
];

export const incomeHistory: WeekIncome[] = [
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

export const monthlyRollup = [
  { month: "June 2026", income: 3720, spending: 3290, saved: 430 },
  { month: "July 2026", income: 3850, spending: 3410, saved: 440 },
  { month: "August 2026", income: 3270, spending: 3215, saved: 55 },
  { month: "September 2026", income: 3810, spending: 3380, saved: 430 },
];

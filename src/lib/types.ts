export type CategoryType = "essential" | "savings" | "flexible";
export type BudgetPeriod = "weekly" | "monthly";
export type BillPeriod = "weekly" | "monthly" | "yearly";
export type WeekStartDay = "Monday" | "Sunday" | "Saturday";
/** ISO 8601 date string, e.g. "2026-10-02". */
export type ISODate = string;

export interface Settings {
  currency: string; // ISO 4217 code, e.g. "USD"
  weekStartDay: WeekStartDay;
  baselineWeeklyIncome: number;
  openingBufferBalance: number;
}

export interface IncomeEntry {
  id: string;
  date: ISODate;
  amount: number;
  source: string;
  note: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  budgetAmount: number;
  budgetPeriod: BudgetPeriod;
}

export interface Transaction {
  id: string;
  date: ISODate;
  amount: number; // positive = money spent
  categoryId: string;
  note: string;
}

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  period: BillPeriod;
  categoryId: string;
  dueDay: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: ISODate;
}

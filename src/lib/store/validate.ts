import type { AppData } from "../types";

export type ValidationResult = { ok: true; data: AppData } | { ok: false; errors: string[] };

const CATEGORY_TYPES = ["essential", "savings", "flexible"];
const BUDGET_PERIODS = ["weekly", "monthly"];
const BILL_PERIODS = ["weekly", "monthly", "yearly"];
const WEEK_START_DAYS = ["Monday", "Sunday", "Saturday"];

function isISODate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parts = value.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function asArray(value: unknown, label: string, errors: string[]): unknown[] {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return [];
  }
  return value;
}

function asRow(value: unknown, label: string, errors: string[]): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    errors.push(`${label} must be an object`);
    return {};
  }
  return value as Record<string, unknown>;
}

function checkUniqueIds(list: unknown[], label: string, errors: string[]): void {
  const seen = new Set<string>();
  list.forEach((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      errors.push(`${label}[${index}] must be an object`);
      return;
    }
    const itemId = (item as Record<string, unknown>)["id"];
    if (!isNonEmptyString(itemId)) {
      errors.push(`${label}[${index}].id must be a non-empty string`);
      return;
    }
    if (seen.has(itemId)) {
      errors.push(`${label} has duplicate id "${itemId}"`);
      return;
    }
    seen.add(itemId);
  });
}

function validateSettings(value: unknown, errors: string[]): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    errors.push("settings must be an object");
    return;
  }
  const settings = value as Record<string, unknown>;
  if (!isNonEmptyString(settings["currency"])) {
    errors.push("settings.currency must be a non-empty string");
  }
  const weekStartDay = settings["weekStartDay"];
  if (typeof weekStartDay !== "string" || !WEEK_START_DAYS.includes(weekStartDay)) {
    errors.push("settings.weekStartDay must be one of Monday, Sunday, Saturday");
  }
  if (!isFiniteNumber(settings["baselineWeeklyIncome"])) {
    errors.push("settings.baselineWeeklyIncome must be a finite number");
  }
  if (!isFiniteNumber(settings["openingBufferBalance"])) {
    errors.push("settings.openingBufferBalance must be a finite number");
  }
}

function validateIncome(item: unknown, index: number, errors: string[]): void {
  const row = asRow(item, `incomeEntries[${index}]`, errors);
  if (!isISODate(row["date"]))
    errors.push(`incomeEntries[${index}].date must be an ISO date (YYYY-MM-DD)`);
  if (!isFiniteNumber(row["amount"])) {
    errors.push(`incomeEntries[${index}].amount must be a finite number`);
  }
  if (typeof row["source"] !== "string")
    errors.push(`incomeEntries[${index}].source must be a string`);
  if (typeof row["note"] !== "string") errors.push(`incomeEntries[${index}].note must be a string`);
}

function validateCategory(item: unknown, index: number, errors: string[]): void {
  const row = asRow(item, `categories[${index}]`, errors);
  if (typeof row["name"] !== "string") errors.push(`categories[${index}].name must be a string`);
  const type = row["type"];
  if (typeof type !== "string" || !CATEGORY_TYPES.includes(type)) {
    errors.push(`categories[${index}].type must be one of essential, savings, flexible`);
  }
  if (!isFiniteNumber(row["budgetAmount"])) {
    errors.push(`categories[${index}].budgetAmount must be a finite number`);
  }
  const budgetPeriod = row["budgetPeriod"];
  if (typeof budgetPeriod !== "string" || !BUDGET_PERIODS.includes(budgetPeriod)) {
    errors.push(`categories[${index}].budgetPeriod must be one of weekly, monthly`);
  }
}

function validateTransaction(item: unknown, index: number, errors: string[]): void {
  const row = asRow(item, `transactions[${index}]`, errors);
  if (!isISODate(row["date"]))
    errors.push(`transactions[${index}].date must be an ISO date (YYYY-MM-DD)`);
  if (!isFiniteNumber(row["amount"])) {
    errors.push(`transactions[${index}].amount must be a finite number`);
  }
  if (!isNonEmptyString(row["categoryId"])) {
    errors.push(`transactions[${index}].categoryId must be a non-empty string`);
  }
  if (typeof row["note"] !== "string") errors.push(`transactions[${index}].note must be a string`);
}

function validateBill(item: unknown, index: number, errors: string[]): void {
  const row = asRow(item, `bills[${index}]`, errors);
  if (typeof row["name"] !== "string") errors.push(`bills[${index}].name must be a string`);
  if (!isFiniteNumber(row["amount"])) errors.push(`bills[${index}].amount must be a finite number`);
  const period = row["period"];
  if (typeof period !== "string" || !BILL_PERIODS.includes(period)) {
    errors.push(`bills[${index}].period must be one of weekly, monthly, yearly`);
  }
  if (!isNonEmptyString(row["categoryId"])) {
    errors.push(`bills[${index}].categoryId must be a non-empty string`);
  }
  if (typeof row["dueDay"] !== "string") errors.push(`bills[${index}].dueDay must be a string`);
}

function validateGoal(item: unknown, index: number, errors: string[]): void {
  const row = asRow(item, `goals[${index}]`, errors);
  if (typeof row["name"] !== "string") errors.push(`goals[${index}].name must be a string`);
  if (!isFiniteNumber(row["targetAmount"])) {
    errors.push(`goals[${index}].targetAmount must be a finite number`);
  }
  if (!isFiniteNumber(row["savedAmount"])) {
    errors.push(`goals[${index}].savedAmount must be a finite number`);
  }
  const targetDate = row["targetDate"];
  if (targetDate !== undefined && !isISODate(targetDate)) {
    errors.push(`goals[${index}].targetDate must be an ISO date (YYYY-MM-DD)`);
  }
}

/** Validates an untrusted value and returns typed AppData or a list of problems. */
export function validateAppData(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: ["Data must be an object"] };
  }

  const source = input as Record<string, unknown>;

  if (source["version"] !== 1) {
    errors.push(`Unsupported version: expected 1, got ${String(source["version"])}`);
  }
  if (typeof source["isDemo"] !== "boolean") {
    errors.push("isDemo must be a boolean");
  }

  validateSettings(source["settings"], errors);

  const incomeEntries = asArray(source["incomeEntries"], "incomeEntries", errors);
  const categories = asArray(source["categories"], "categories", errors);
  const transactions = asArray(source["transactions"], "transactions", errors);
  const bills = asArray(source["bills"], "bills", errors);
  const goals = asArray(source["goals"], "goals", errors);

  checkUniqueIds(incomeEntries, "incomeEntries", errors);
  checkUniqueIds(categories, "categories", errors);
  checkUniqueIds(transactions, "transactions", errors);
  checkUniqueIds(bills, "bills", errors);
  checkUniqueIds(goals, "goals", errors);

  incomeEntries.forEach((item, index) => validateIncome(item, index, errors));
  categories.forEach((item, index) => validateCategory(item, index, errors));
  transactions.forEach((item, index) => validateTransaction(item, index, errors));
  bills.forEach((item, index) => validateBill(item, index, errors));
  goals.forEach((item, index) => validateGoal(item, index, errors));

  const categoryIds = new Set(
    categories
      .map((item) => (item as Record<string, unknown>)["id"])
      .filter((value): value is string => typeof value === "string"),
  );

  transactions.forEach((item, index) => {
    const categoryId = (item as Record<string, unknown>)["categoryId"];
    if (isNonEmptyString(categoryId) && !categoryIds.has(categoryId)) {
      errors.push(`transactions[${index}].categoryId "${categoryId}" does not exist`);
    }
  });
  bills.forEach((item, index) => {
    const categoryId = (item as Record<string, unknown>)["categoryId"];
    if (isNonEmptyString(categoryId) && !categoryIds.has(categoryId)) {
      errors.push(`bills[${index}].categoryId "${categoryId}" does not exist`);
    }
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: input as AppData };
}

/** Serialises app data to a JSON string. */
export function exportData(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

/** Parses and validates a JSON string produced by {@link exportData}. */
export function importData(json: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, errors: ["Invalid JSON"] };
  }
  return validateAppData(parsed);
}

import type {
  AppData,
  Category,
  Goal,
  IncomeEntry,
  RecurringBill,
  Settings,
  Transaction,
} from "../types";
import { startFresh } from "./seed";
import {
  billRecordErrors,
  categoryRecordErrors,
  goalRecordErrors,
  incomeRecordErrors,
  isNonEmptyString,
  settingsRecordErrors,
  starterCategoryErrors,
  transactionRecordErrors,
} from "./validate";

/** Generates a unique id, preferring `crypto.randomUUID` when available. */
export function id(): string {
  try {
    const cryptoObject = globalThis.crypto;
    if (cryptoObject && typeof cryptoObject.randomUUID === "function") {
      return cryptoObject.randomUUID();
    }
  } catch {
    // fall through to the non-crypto fallback below
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type NewIncome = Omit<IncomeEntry, "id">;
export type NewTransaction = Omit<Transaction, "id">;
export type NewCategory = Omit<Category, "id">;
export type NewBill = Omit<RecurringBill, "id">;
export type NewGoal = Omit<Goal, "id">;

export type AppAction =
  | { type: "addIncome"; item: NewIncome }
  | { type: "updateIncome"; item: IncomeEntry }
  | { type: "deleteIncome"; id: string }
  | { type: "addTransaction"; item: NewTransaction }
  | { type: "updateTransaction"; item: Transaction }
  | { type: "deleteTransaction"; id: string }
  | { type: "addCategory"; item: NewCategory }
  | { type: "updateCategory"; item: Category }
  | { type: "deleteCategory"; id: string }
  | { type: "addBill"; item: NewBill }
  | { type: "updateBill"; item: RecurringBill }
  | { type: "deleteBill"; id: string }
  | { type: "addGoal"; item: NewGoal }
  | { type: "updateGoal"; item: Goal }
  | { type: "deleteGoal"; id: string }
  | { type: "setSettings"; settings: Settings }
  | { type: "replaceAll"; data: AppData }
  | { type: "startFresh"; settings: Settings }
  | { type: "startFreshWithCategories"; settings: Settings; categories: NewCategory[] };

export type AppReducerResult = { ok: true; data: AppData } | { ok: false; error: string };

const ok = (data: AppData): AppReducerResult => ({ ok: true, data });
const refuse = (error: string): AppReducerResult => ({ ok: false, error });

function firstError(errors: string[]): string | null {
  return errors.length > 0 ? (errors[0] ?? null) : null;
}

function requireId(value: unknown, label: string): string | null {
  return isNonEmptyString(value) ? null : `${label} id is required`;
}

function requireExisting<T extends { id: string }>(
  list: T[],
  targetId: string,
  label: string,
): string | null {
  return list.some((row) => row.id === targetId) ? null : `${label} not found: "${targetId}".`;
}

function hasCategory(state: AppData, categoryId: string): boolean {
  return state.categories.some((row) => row.id === categoryId);
}

/** Validates every category template, naming the first offender in the message. */
function starterCategoriesError(categories: NewCategory[]): string | null {
  for (let index = 0; index < categories.length; index += 1) {
    const category = categories[index];
    const error = firstError(starterCategoryErrors(category));
    if (error) {
      const label = category?.name ? `"${category.name}"` : `#${index + 1}`;
      return `Category ${label}: ${error}`;
    }
  }
  return null;
}

function addById<T extends { id: string }>(list: T[], item: Omit<T, "id">): T[] {
  return [...list, { ...item, id: id() } as T];
}

function updateBy<T extends { id: string }>(list: T[], item: T): T[] {
  return list.map((existing) => (existing.id === item.id ? item : existing));
}

function removeById<T extends { id: string }>(list: T[], targetId: string): T[] {
  return list.filter((existing) => existing.id !== targetId);
}

export function appReducer(state: AppData, action: AppAction): AppReducerResult {
  switch (action.type) {
    case "addIncome": {
      const error = firstError(incomeRecordErrors(action.item));
      if (error) return refuse(error);
      return ok({ ...state, incomeEntries: addById(state.incomeEntries, action.item) });
    }
    case "updateIncome": {
      const error =
        firstError(incomeRecordErrors(action.item)) ??
        requireId(action.item.id, "income") ??
        requireExisting(state.incomeEntries, action.item.id, "income");
      if (error) return refuse(error);
      return ok({ ...state, incomeEntries: updateBy(state.incomeEntries, action.item) });
    }
    case "deleteIncome":
      return ok({ ...state, incomeEntries: removeById(state.incomeEntries, action.id) });

    case "addTransaction": {
      const error =
        firstError(transactionRecordErrors(action.item)) ??
        (hasCategory(state, action.item.categoryId)
          ? null
          : `Unknown category: "${action.item.categoryId}".`);
      if (error) return refuse(error);
      return ok({ ...state, transactions: addById(state.transactions, action.item) });
    }
    case "updateTransaction": {
      const error =
        firstError(transactionRecordErrors(action.item)) ??
        requireId(action.item.id, "transaction") ??
        requireExisting(state.transactions, action.item.id, "transaction") ??
        (hasCategory(state, action.item.categoryId)
          ? null
          : `Unknown category: "${action.item.categoryId}".`);
      if (error) return refuse(error);
      return ok({ ...state, transactions: updateBy(state.transactions, action.item) });
    }
    case "deleteTransaction":
      return ok({ ...state, transactions: removeById(state.transactions, action.id) });

    case "addCategory": {
      const error = firstError(categoryRecordErrors(action.item));
      if (error) return refuse(error);
      return ok({ ...state, categories: addById(state.categories, action.item) });
    }
    case "updateCategory": {
      const error =
        firstError(categoryRecordErrors(action.item)) ??
        requireId(action.item.id, "category") ??
        requireExisting(state.categories, action.item.id, "category");
      if (error) return refuse(error);
      return ok({ ...state, categories: updateBy(state.categories, action.item) });
    }
    case "deleteCategory":
      return deleteCategory(state, action.id);

    case "addBill": {
      const error =
        firstError(billRecordErrors(action.item)) ??
        (hasCategory(state, action.item.categoryId)
          ? null
          : `Unknown category: "${action.item.categoryId}".`);
      if (error) return refuse(error);
      return ok({ ...state, bills: addById(state.bills, action.item) });
    }
    case "updateBill": {
      const error =
        firstError(billRecordErrors(action.item)) ??
        requireId(action.item.id, "bill") ??
        requireExisting(state.bills, action.item.id, "bill") ??
        (hasCategory(state, action.item.categoryId)
          ? null
          : `Unknown category: "${action.item.categoryId}".`);
      if (error) return refuse(error);
      return ok({ ...state, bills: updateBy(state.bills, action.item) });
    }
    case "deleteBill":
      return ok({ ...state, bills: removeById(state.bills, action.id) });

    case "addGoal": {
      const error = firstError(goalRecordErrors(action.item));
      if (error) return refuse(error);
      return ok({ ...state, goals: addById(state.goals, action.item) });
    }
    case "updateGoal": {
      const error =
        firstError(goalRecordErrors(action.item)) ??
        requireId(action.item.id, "goal") ??
        requireExisting(state.goals, action.item.id, "goal");
      if (error) return refuse(error);
      return ok({ ...state, goals: updateBy(state.goals, action.item) });
    }
    case "deleteGoal":
      return ok({ ...state, goals: removeById(state.goals, action.id) });

    case "setSettings": {
      const error = firstError(settingsRecordErrors(action.settings));
      if (error) return refuse(error);
      return ok({ ...state, settings: { ...action.settings } });
    }
    case "replaceAll":
      return ok(action.data);
    case "startFresh": {
      const error = firstError(settingsRecordErrors(action.settings));
      if (error) return refuse(error);
      return ok(startFresh(action.settings));
    }
    case "startFreshWithCategories": {
      const error =
        firstError(settingsRecordErrors(action.settings)) ??
        starterCategoriesError(action.categories);
      if (error) return refuse(error);
      const fresh = startFresh(action.settings);
      return ok({
        ...fresh,
        categories: action.categories.map((category) => ({ ...category, id: id() })),
      });
    }

    default: {
      const exhaustive: never = action;
      return refuse(`Unknown action: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function deleteCategory(state: AppData, targetId: string): AppReducerResult {
  const category = state.categories.find((row) => row.id === targetId);
  const label = category ? category.name : targetId;
  const usedByTransaction = state.transactions.some((row) => row.categoryId === targetId);
  const usedByBill = state.bills.some((row) => row.categoryId === targetId);

  if (usedByTransaction || usedByBill) {
    const sources = [usedByTransaction ? "transactions" : null, usedByBill ? "bills" : null]
      .filter((source): source is string => source !== null)
      .join(" and ");
    return refuse(`Cannot delete "${label}": it is still used by ${sources}.`);
  }

  return ok({ ...state, categories: removeById(state.categories, targetId) });
}

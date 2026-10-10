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
  | { type: "startFresh"; settings: Settings };

export type AppReducerResult = { ok: true; data: AppData } | { ok: false; error: string };

const ok = (data: AppData): AppReducerResult => ({ ok: true, data });
const refuse = (error: string): AppReducerResult => ({ ok: false, error });

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
    case "addIncome":
      return ok({ ...state, incomeEntries: addById(state.incomeEntries, action.item) });
    case "updateIncome":
      return ok({ ...state, incomeEntries: updateBy(state.incomeEntries, action.item) });
    case "deleteIncome":
      return ok({ ...state, incomeEntries: removeById(state.incomeEntries, action.id) });

    case "addTransaction":
      return ok({ ...state, transactions: addById(state.transactions, action.item) });
    case "updateTransaction":
      return ok({ ...state, transactions: updateBy(state.transactions, action.item) });
    case "deleteTransaction":
      return ok({ ...state, transactions: removeById(state.transactions, action.id) });

    case "addCategory":
      return ok({ ...state, categories: addById(state.categories, action.item) });
    case "updateCategory":
      return ok({ ...state, categories: updateBy(state.categories, action.item) });
    case "deleteCategory":
      return deleteCategory(state, action.id);

    case "addBill":
      return ok({ ...state, bills: addById(state.bills, action.item) });
    case "updateBill":
      return ok({ ...state, bills: updateBy(state.bills, action.item) });
    case "deleteBill":
      return ok({ ...state, bills: removeById(state.bills, action.id) });

    case "addGoal":
      return ok({ ...state, goals: addById(state.goals, action.item) });
    case "updateGoal":
      return ok({ ...state, goals: updateBy(state.goals, action.item) });
    case "deleteGoal":
      return ok({ ...state, goals: removeById(state.goals, action.id) });

    case "setSettings":
      return ok({ ...state, settings: { ...action.settings } });
    case "replaceAll":
      return ok(action.data);
    case "startFresh":
      return ok(startFresh(action.settings));

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

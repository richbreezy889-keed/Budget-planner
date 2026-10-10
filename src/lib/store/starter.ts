import type { Category } from "../types";

/** A category template without an id, ready to be given one when it is created. */
export type StarterCategory = Omit<Category, "id">;

const TEMPLATES: StarterCategory[] = [
  { name: "Rent", type: "essential", budgetAmount: 0, budgetPeriod: "monthly" },
  { name: "Groceries", type: "essential", budgetAmount: 0, budgetPeriod: "weekly" },
  { name: "Transport", type: "essential", budgetAmount: 0, budgetPeriod: "weekly" },
  { name: "Utilities", type: "essential", budgetAmount: 0, budgetPeriod: "monthly" },
  { name: "Phone and internet", type: "essential", budgetAmount: 0, budgetPeriod: "monthly" },
  { name: "Emergency fund", type: "savings", budgetAmount: 0, budgetPeriod: "weekly" },
  { name: "Dining out", type: "flexible", budgetAmount: 0, budgetPeriod: "weekly" },
  { name: "Fun", type: "flexible", budgetAmount: 0, budgetPeriod: "weekly" },
];

/** The starter category templates offered by the start-fresh flow. */
export function starterCategories(): StarterCategory[] {
  return TEMPLATES.map((template) => ({ ...template }));
}

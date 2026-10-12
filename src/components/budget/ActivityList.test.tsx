import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { thisWeekView } from "@/lib/selectors";
import type { AppData, Category } from "@/lib/types";
import { ActivityList } from "./ActivityList";

const categories: Category[] = [
  {
    id: "c1",
    name: "Groceries",
    type: "flexible",
    budgetAmount: 200,
    budgetPeriod: "weekly",
  },
];

const data: AppData = {
  version: 1,
  isDemo: false,
  settings: {
    currency: "USD",
    weekStartDay: "Monday",
    baselineWeeklyIncome: 500,
    openingBufferBalance: 0,
  },
  incomeEntries: [{ id: "i1", date: "2026-10-19", amount: 500, source: "Pay", note: "Pay" }],
  categories,
  transactions: [{ id: "t1", date: "2026-10-20", amount: 40, categoryId: "c1", note: "Food" }],
  bills: [],
  goals: [],
};

const week = thisWeekView(data, "2026-10-19");

describe("ActivityList", () => {
  it("offers edit and delete on each entry outside demo mode", () => {
    render(
      <ActivityList
        week={week}
        currency="USD"
        categories={categories}
        isDemo={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Edit Pay" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Food" })).toBeInTheDocument();
  });

  it("passes the clicked entry to onEdit", () => {
    const onEdit = vi.fn();
    render(
      <ActivityList
        week={week}
        currency="USD"
        categories={categories}
        isDemo={false}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Food" }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "t1", kind: "spend" }));
  });

  it("confirms a delete by name and amount before dispatching", () => {
    const onDelete = vi.fn();
    render(
      <ActivityList
        week={week}
        currency="USD"
        categories={categories}
        isDemo={false}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Food" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText(/Delete "Food" \(\$40\.00\)\?/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }));
  });

  it("hides the controls in demo mode", () => {
    render(
      <ActivityList
        week={week}
        currency="USD"
        categories={categories}
        isDemo
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Edit Food" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Food" })).not.toBeInTheDocument();
  });
});

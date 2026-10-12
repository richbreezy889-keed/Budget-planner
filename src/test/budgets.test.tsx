import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppDataProvider } from "@/lib/store/AppDataProvider";
import { createSeedData, startFresh } from "@/lib/store/seed";
import type { LoadResult, SaveResult, StorageAdapter } from "@/lib/store/storage";
import type { AppData } from "@/lib/types";
import { BudgetsPage } from "@/routes/budgets";

function spyAdapter(initial: AppData | null = null) {
  let stored = initial;
  const load = vi.fn((): LoadResult => ({
    data: stored ?? createSeedData(),
    status: stored ? "ok" : "seeded",
  }));
  const save = vi.fn((data: AppData): SaveResult => {
    stored = data;
    return { ok: true };
  });
  const clear = vi.fn(() => {
    stored = null;
  });
  const adapter: StorageAdapter = { load, save, clear };
  return adapter;
}

const emptyReal = () =>
  startFresh({
    currency: "USD",
    weekStartDay: "Monday",
    baselineWeeklyIncome: 500,
    openingBufferBalance: 1000,
  });

const wrap = (adapter: StorageAdapter) => (
  <AppDataProvider storage={adapter}>
    <BudgetsPage />
  </AppDataProvider>
);

const savedData = (adapter: StorageAdapter) =>
  vi.mocked(adapter.save).mock.calls.at(-1)?.[0] as AppData;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.UTC(2026, 9, 19, 8, 0, 0)));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Budgets category management", () => {
  it("adds a category", () => {
    const adapter = spyAdapter(emptyReal());
    render(wrap(adapter));

    fireEvent.change(screen.getByLabelText("Category name"), { target: { value: "Fun" } });
    fireEvent.change(screen.getByLabelText("Category type"), { target: { value: "flexible" } });
    fireEvent.change(screen.getByLabelText("Category amount"), { target: { value: "200" } });
    fireEvent.change(screen.getByLabelText("Category period"), { target: { value: "weekly" } });
    fireEvent.click(screen.getByRole("button", { name: "Add category" }));

    expect(screen.getByText("Category added")).toBeInTheDocument();
    expect(screen.getByText("Fun")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    const saved = savedData(adapter);
    expect(saved.categories).toHaveLength(1);
    expect(saved.categories[0]).toMatchObject({
      name: "Fun",
      type: "flexible",
      budgetAmount: 200,
      budgetPeriod: "weekly",
    });
  });

  it("allows an amount of zero", () => {
    const adapter = spyAdapter(emptyReal());
    render(wrap(adapter));

    fireEvent.change(screen.getByLabelText("Category name"), { target: { value: "Zero" } });
    fireEvent.change(screen.getByLabelText("Category amount"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Add category" }));

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(savedData(adapter).categories[0]?.budgetAmount).toBe(0);
  });

  it("edits a category", () => {
    const data = emptyReal();
    data.categories = [
      { id: "c1", name: "Rent", type: "essential", budgetAmount: 1000, budgetPeriod: "monthly" },
    ];
    const adapter = spyAdapter(data);
    render(wrap(adapter));

    fireEvent.click(screen.getByRole("button", { name: "Edit Rent" }));

    expect(screen.getByText("Edit category")).toBeInTheDocument();
    expect(screen.getByLabelText("Category name")).toHaveValue("Rent");
    fireEvent.change(screen.getByLabelText("Category amount"), { target: { value: "1200" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByText("Category updated")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(savedData(adapter).categories[0]?.budgetAmount).toBe(1200);
  });

  it("refuses to delete a category still used by a transaction", () => {
    const data = emptyReal();
    data.categories = [
      { id: "c1", name: "Rent", type: "essential", budgetAmount: 1000, budgetPeriod: "monthly" },
    ];
    data.transactions = [
      { id: "t1", date: "2026-10-20", amount: 50, categoryId: "c1", note: "Food" },
    ];
    const adapter = spyAdapter(data);
    render(wrap(adapter));

    fireEvent.click(screen.getByRole("button", { name: "Delete Rent" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(screen.getByRole("alert")).toHaveTextContent('Cannot delete "Rent"');
    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(adapter.save).not.toHaveBeenCalled();
  });

  it("validates empty name and amount", () => {
    const adapter = spyAdapter(emptyReal());
    render(wrap(adapter));

    fireEvent.click(screen.getByRole("button", { name: "Add category" }));

    expect(screen.getByText("Enter a category name.")).toBeInTheDocument();
    expect(screen.getByText("Enter an amount of zero or more.")).toBeInTheDocument();
    expect(adapter.save).not.toHaveBeenCalled();
  });

  it("hides the management controls in demo mode", () => {
    render(wrap(spyAdapter()));

    expect(screen.queryByText("Add category")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Edit / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete / })).not.toBeInTheDocument();
  });
});

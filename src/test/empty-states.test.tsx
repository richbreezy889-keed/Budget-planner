import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppDataProvider } from "@/lib/store/AppDataProvider";
import { createSeedData, startFresh } from "@/lib/store/seed";
import type { LoadResult, SaveResult, StorageAdapter } from "@/lib/store/storage";
import type { AppData } from "@/lib/types";
import { BudgetsPage } from "@/routes/budgets";
import { ThisWeek } from "@/routes/index";

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

const wrap = (adapter: StorageAdapter, Page: ComponentType) => (
  <AppDataProvider storage={adapter}>
    <Page />
  </AppDataProvider>
);

const flush = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(700);
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.UTC(2026, 9, 19, 8, 0, 0)));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Empty states for non-demo data", () => {
  it("This Week shows the flexible-budget notice but keeps the add form", () => {
    render(wrap(spyAdapter(emptyReal()), ThisWeek));

    expect(screen.getByText("Set a flexible budget to see your safe-to-spend")).toBeInTheDocument();
    expect(screen.queryByText("Safe to spend this week")).not.toBeInTheDocument();
    expect(screen.getByText("Quick add")).toBeInTheDocument();
    expect(screen.getByText("This week's activity")).toBeInTheDocument();
  });

  it("still adds income and spending when there is no flexible budget", async () => {
    const data = emptyReal();
    data.categories = [
      { id: "c1", name: "Rent", type: "essential", budgetAmount: 0, budgetPeriod: "monthly" },
    ];
    render(wrap(spyAdapter(data), ThisWeek));

    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "Pay" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to week" }));
    await flush();
    expect(screen.getByText("Pay")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Spend" }));
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "c1" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "Food" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to week" }));
    await flush();
    expect(screen.getByText("Food")).toBeInTheDocument();
  });

  it("Budgets explains there are no categories", () => {
    render(wrap(spyAdapter(emptyReal()), BudgetsPage));

    expect(screen.getByText("No budget categories yet")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Essential" })).not.toBeInTheDocument();
  });

  it("never treats demo data as empty", () => {
    render(wrap(spyAdapter(), ThisWeek));

    expect(screen.getByText("Safe to spend this week")).toBeInTheDocument();
    expect(
      screen.queryByText("Set a flexible budget to see your safe-to-spend"),
    ).not.toBeInTheDocument();
  });
});

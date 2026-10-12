import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppDataProvider } from "@/lib/store/AppDataProvider";
import { createSeedData, startFresh } from "@/lib/store/seed";
import type { LoadResult, SaveResult, StorageAdapter } from "@/lib/store/storage";
import type { AppData } from "@/lib/types";
import { BillsPage } from "@/routes/bills";

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

const goalData = () => {
  const data = startFresh({
    currency: "USD",
    weekStartDay: "Monday",
    baselineWeeklyIncome: 500,
    openingBufferBalance: 1000,
  });
  data.categories = [
    { id: "sav", name: "Emergency", type: "savings", budgetAmount: 0, budgetPeriod: "monthly" },
    { id: "fun", name: "Fun", type: "flexible", budgetAmount: 100, budgetPeriod: "weekly" },
  ];
  data.goals = [{ id: "g1", name: "Holiday", targetAmount: 1000, savedAmount: 100 }];
  return data;
};

const wrap = (adapter: StorageAdapter) => (
  <AppDataProvider storage={adapter}>
    <BillsPage />
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

describe("Goal contributions", () => {
  it("logs a savings transaction and advances the goal", () => {
    const adapter = spyAdapter(goalData());
    render(wrap(adapter));

    fireEvent.click(screen.getByRole("button", { name: "Add to goal Holiday" }));
    fireEvent.change(screen.getByLabelText("Contribution amount"), { target: { value: "150" } });
    fireEvent.change(screen.getByLabelText("Contribution date"), {
      target: { value: "2026-10-05" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add contribution" }));

    expect(screen.getByRole("status")).toHaveTextContent("Added $150.00 to Holiday.");
    expect(screen.getByText("$250")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const saved = savedData(adapter);
    expect(saved.goals[0]?.savedAmount).toBe(250);
    expect(saved.transactions.at(-1)).toMatchObject({
      amount: 150,
      date: "2026-10-05",
      categoryId: "sav",
      note: "Goal: Holiday",
    });
  });

  it("refuses an empty amount and does not save", () => {
    const adapter = spyAdapter(goalData());
    render(wrap(adapter));

    fireEvent.click(screen.getByRole("button", { name: "Add to goal Holiday" }));
    fireEvent.click(screen.getByRole("button", { name: "Add contribution" }));

    expect(screen.getByText("Enter an amount greater than zero.")).toBeInTheDocument();
    expect(adapter.save).not.toHaveBeenCalled();
  });

  it("closes the form on cancel", () => {
    render(wrap(spyAdapter(goalData())));

    fireEvent.click(screen.getByRole("button", { name: "Add to goal Holiday" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("Contribution amount")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to goal Holiday" })).toBeInTheDocument();
  });

  it("hides the control in demo mode", () => {
    render(wrap(spyAdapter()));

    expect(screen.queryByRole("button", { name: /^Add to goal / })).not.toBeInTheDocument();
  });
});
